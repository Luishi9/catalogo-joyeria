// scripts/migrar-firestore-a-supabase.js
// Migra los datos exportados de Firestore (backup-joyeria-*.json) a Supabase.
//
// Uso:
//   node --env-file=.env scripts/migrar-firestore-a-supabase.js <directorio-del-backup>
//
// Requisitos en .env:
//   VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_BUCKET
//
// Que hace:
//   1. Localiza el backup-joyeria-*.json mas reciente en el directorio indicado.
//   2. Por cada producto/piedra con imagen, descarga la imagen (con reintentos
//      ante 429) y la sube a Supabase Storage.
//   3. Inserta la fila en la tabla correspondiente con image (URL publica)
//      e image_path (ruta en el bucket).
//   4. Reporta por fila y un resumen final.

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const url = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.VITE_SUPABASE_BUCKET || 'imagenes-joyeria';

if (!url || !serviceRoleKey) {
  console.error('Faltan VITE_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey);

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
function extFromUrl(u) {
  const clean = u.split('?')[0].split('#')[0];
  const m = clean.match(/\.(png|webp|gif|jpe?g)$/i);
  if (!m) return 'jpg';
  const e = m[1].toLowerCase();
  return e === 'jpeg' ? 'jpg' : e;
}

function safeName(s) {
  return String(s || '').replace(/[^\w.-]+/g, '_').slice(0, 60) || 'item';
}

// Descarga una URL con reintentos ante 429 (rate limit) usando backoff.
async function fetchConRetry(urlOrPath, intentos = 5) {
  let wait = 1000;
  for (let i = 1; i <= intentos; i++) {
    try {
      const resp = await fetch(urlOrPath);
      if (resp.status === 429) {
        const retryAfter = parseInt(resp.headers.get('retry-after') || '0', 10) * 1000;
        const delay = retryAfter > 0 ? retryAfter : wait;
        console.log(`  [429] rate limit. Reintentando en ${Math.round(delay / 1000)}s (intento ${i})`);
        await sleep(delay);
        wait *= 2;
        continue;
      }
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return resp;
    } catch (e) {
      if (i === intentos) throw e;
      console.log(`  Error al descargar (${e.message}). Reintento ${i}/${intentos} en ${Math.round(wait / 1000)}s`);
      await sleep(wait);
      wait *= 2;
    }
  }
  throw new Error('No se pudo descargar la URL');
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Sube una imagen (arrayBuffer) a Supabase Storage y devuelve { path, publicUrl }.
async function subirImagen(carpeta, nombreBase, buffer, contentType) {
  const path = `${carpeta}/${Date.now()}-${safeName(nombreBase)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(`Storage upload: ${error.message}`);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path, publicUrl: data?.publicUrl };
}

// ---------------------------------------------------------------------------
// Carga del backup
// ---------------------------------------------------------------------------
function findBackup(dir) {
  const files = readdirSync(dir)
    .filter(f => /^backup-joyeria-.*\.json$/i.test(f))
    .map(f => ({ f, t: statSync(join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  if (files.length === 0) {
    console.error(`No se encontro un archivo backup-joyeria-*.json en: ${dir}`);
    process.exit(1);
  }
  return join(dir, files[0].f);
}

// ---------------------------------------------------------------------------
// Migracion
// ---------------------------------------------------------------------------
async function migrarColeccion(nombre, registros, campoImagen, extraTransform) {
  console.log(`\n=== Migrando "${nombre}" (${registros.length} registros) ===`);
  let ok = 0, fallidos = 0;

  for (const item of registros) {
    try {
      const fila = extraTransform ? extraTransform(item) : { ...item };

      // Migrar imagen si existe y es una URL externa (ej: ImgBB)
      const imageUrl = item[campoImagen];
      if (imageUrl && typeof imageUrl === 'string') {
        console.log(`  Descargando imagen de ${imageUrl}`);
        const resp = await fetchConRetry(imageUrl);
        const buffer = new Uint8Array(await resp.arrayBuffer());
        const contentType = resp.headers.get('content-type') || 'image/jpeg';
        const ext = extFromUrl(imageUrl);
        const { path, publicUrl } = await subirImagen(
          nombre,
          `${(item.name || item.nombre || item.id || 'img')}.${ext}`,
          buffer,
          contentType
        );
        fila.image = publicUrl;
        fila.image_path = path;
      }

      // Insertar fila
      const { error } = await supabase.from(nombre).insert(fila);
      if (error) throw new Error(`Insert: ${error.message}`);

      console.log(`  [OK] ${item.name || item.nombre || item.id}`);
      ok++;
    } catch (e) {
      console.error(`  [FALLO] ${item.name || item.nombre || item.id}: ${e.message}`);
      fallidos++;
    }
  }
  return { ok, fallidos };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const dir = process.argv[2] || 'migrations';
  const backupPath = findBackup(dir);
  console.log(`Usando backup: ${backupPath}\n`);

  const raw = JSON.parse(readFileSync(backupPath, 'utf8'));
  const colecciones = raw.colecciones || raw;

  const productos = colecciones.productos || [];
  const piedras = colecciones.piedras || [];

  const resP = await migrarColeccion('productos', productos, 'image', (item) => ({
    name: item.name,
    description: item.description,
    category: item.category,
    material: item.material || null,
  }));

  const resR = await migrarColeccion('piedras', piedras, 'image', (item) => ({
    nombre: item.nombre,
    info: item.info || null,
  }));

  console.log('\n=== RESUMEN FINAL ===');
  console.log(`Productos: ${resP.ok} ok, ${resP.fallidos} fallidos`);
  console.log(`Piedras:   ${resR.ok} ok, ${resR.fallidos} fallidos`);
  const totalFallidos = resP.fallidos + resR.fallidos;
  if (totalFallidos > 0) {
    console.log(`\nATENCION: ${totalFallidos} registro(s) fallaron. Revisa los mensajes de error arriba.`);
  } else {
    console.log('\nMigracion completada sin errores.');
  }
}

main().catch((e) => {
  console.error('Error fatal:', e);
  process.exit(1);
});