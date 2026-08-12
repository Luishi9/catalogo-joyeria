// src/pages/admin/export.js
// Modulo de exportacion de datos (JSON) e imagenes (ZIP) desde Supabase.
// Depende de JSZip (cargado por CDN en index.html como window.JSZip).

import { supabase } from '../../lib/supabase.js';

// Colleccion -> campo que contiene la URL publica de la imagen
const IMAGE_FIELDS = {
    productos: 'image',
    piedras: 'image'
};

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

// Convierte Timestamps ISO/Date a strings legibles para el JSON.
function serialize(value) {
    if (value === null || value === undefined) return value;
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    if (Array.isArray(value)) return value.map(serialize);
    if (typeof value === 'object') {
        const out = {};
        for (const k in value) out[k] = serialize(value[k]);
        return out;
    }
    return value;
}

function fechaHoy() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Dispara la descarga de un Blob en el navegador.
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Liberar memoria en el siguiente tick
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadJSON(obj, filename) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    downloadBlob(blob, filename);
}

// Extencion preferida a partir del Content-Type de la respuesta.
function extFromContentType(ct) {
    if (!ct) return 'jpg';
    ct = ct.toLowerCase();
    if (ct.includes('png')) return 'png';
    if (ct.includes('webp')) return 'webp';
    if (ct.includes('gif')) return 'gif';
    if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpg';
    return 'jpg';
}

// Sanea un texto para usarlo como nombre de archivo dentro del ZIP.
function safeName(s) {
    return String(s || '').replace(/[^\w.-]+/g, '_').slice(0, 60) || 'sin_nombre';
}

// ---------------------------------------------------------------------------
// Exportacion de colecciones a JSON
// ---------------------------------------------------------------------------

async function exportarColeccion(nombre) {
    const { data: rows, error } = await supabase
        .from(nombre)
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw new Error(`Error al leer ${nombre}: ${error.message}`);
    return (rows || []).map(d => ({ id: d.id, ...serialize(d) }));
}

// ---------------------------------------------------------------------------
// Exportacion de imagenes a ZIP
// ---------------------------------------------------------------------------

// Descarga una imagen con fetch, devuelve { blob, ext } o lanza error.
async function fetchImagen(url) {
    const resp = await fetch(url, { mode: 'cors' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    const ext = extFromContentType(resp.headers.get('Content-Type'));
    return { blob, ext };
}

// Ejecuta las promesas en lotes con concurrencia limitada para no saturar
// el navegador ni el servidor de imágenes.
async function pool(items, concurrency, worker, onProgress) {
    let index = 0;
    let done = 0;
    const total = items.length;

    async function run() {
        while (index < total) {
            const i = index++;
            try {
                await worker(items[i], i);
            } catch (e) {
                // El worker debe manejar sus propios errores; esto es red de ultimo recurso.
                console.warn('pool worker error', e);
            }
            done++;
            if (onProgress) onProgress(done, total);
        }
    }

    const runners = Array.from({ length: Math.min(concurrency, total) }, run);
    await Promise.all(runners);
}

async function exportarImagenesZIP(colecciones, onProgress) {
    if (!window.JSZip) throw new Error('JSZip no cargado. Verifica el CDN en index.html.');

    const zip = new JSZip();
    const errores = [];

    // Construir la lista de trabajo: { url, filename, coleccion, docId }
    const tareas = [];
    for (const coll of colecciones) {
        const campoImg = IMAGE_FIELDS[coll] || 'image';
        const datos = await exportarColeccion(coll);
        datos.forEach(doc => {
            const url = doc[campoImg];
            if (!url || typeof url !== 'string') return;
            const nombreBase = `${coll}_${safeName(doc.id || doc.name || doc.nombre || 'item')}`;
            tareas.push({ url, coleccion: coll, docId: doc.id, nombreBase });
        });
    }

    if (tareas.length === 0) {
        // ZIP vacio con un README
        zip.file('_README.txt', 'No se encontraron imagenes para exportar.');
    }

    await pool(tareas, 6, async (tarea, i) => {
        try {
            const { blob, ext } = await fetchImagen(tarea.url);
            // Evitar colisiones anadiendo indice unico
            const filename = `imagenes/${tarea.coleccion}/${tarea.nombreBase}.${ext}`;
            zip.file(filename, blob);
        } catch (err) {
            errores.push({
                coleccion: tarea.coleccion,
                docId: tarea.docId,
                url: tarea.url,
                error: err.message
            });
        }
    }, onProgress);

    if (errores.length > 0) {
        zip.file('_errores.txt', errores.map(e =>
            `[${e.coleccion}] ${e.docId}\n${e.url}\n-> ${e.error}\n`
        ).join('\n'));
    }

    return zip.generateAsync({ type: 'blob' });
}

// ---------------------------------------------------------------------------
// Orquestadores de UI
// ---------------------------------------------------------------------------

function getProgressElements() {
    return {
        bar: document.getElementById('export-progress-bar'),
        text: document.getElementById('export-progress-text'),
        wrap: document.getElementById('export-progress')
    };
}

function mostrarProgreso(visible) {
    const { wrap } = getProgressElements();
    if (!wrap) return;
    wrap.classList.toggle('d-none', !visible);
}

function actualizarProgreso(done, total) {
    const { bar, text } = getProgressElements();
    if (total <= 0 || !bar || !text) return;
    const pct = Math.round((done / total) * 100);
    bar.style.width = `${pct}%`;
    bar.setAttribute('aria-valuenow', String(pct));
    text.textContent = `${done} / ${total}`;
}

function setBotonesHabilitados(enabled) {
    ['btn-export-json', 'btn-export-zip', 'btn-export-all'].forEach(id => {
        const b = document.getElementById(id);
        if (b) b.disabled = !enabled;
    });
}

async function manejarExportarJSON() {
    setBotonesHabilitados(false);
    try {
        const productos = await exportarColeccion('productos');
        const piedras = await exportarColeccion('piedras');
        const json = {
            exportadoEn: new Date().toISOString(),
            proyecto: 'catalogo-joyeria',
            colecciones: { productos, piedras }
        };
        downloadJSON(json, `backup-joyeria-${fechaHoy()}.json`);
    } catch (err) {
        console.error('Error al exportar JSON:', err);
        alert('Error al exportar JSON. Revisa la consola (F12).');
    } finally {
        setBotonesHabilitados(true);
    }
}

async function manejarExportarZIP() {
    setBotonesHabilitados(false);
    mostrarProgreso(true);
    actualizarProgreso(0, 1);
    try {
        const blob = await exportarImagenesZIP(['productos', 'piedras'], (done, total) => {
            actualizarProgreso(done, total);
        });
        downloadBlob(blob, `imagenes-joyeria-${fechaHoy()}.zip`);
    } catch (err) {
        console.error('Error al exportar ZIP:', err);
        alert('Error al exportar imagenes. Revisa la consola (F12).');
    } finally {
        setBotonesHabilitados(true);
        mostrarProgreso(false);
    }
}

async function manejarExportarTodo() {
    await manejarExportarJSON();
    await manejarExportarZIP();
}

// ---------------------------------------------------------------------------
//Inicializacion cuando el DOM esta listo
// ---------------------------------------------------------------------------

export function initExportUI() {
    const btnJSON = document.getElementById('btn-export-json');
    const btnZIP = document.getElementById('btn-export-zip');
    const btnAll = document.getElementById('btn-export-all');

    if (btnJSON) btnJSON.addEventListener('click', manejarExportarJSON);
    if (btnZIP) btnZIP.addEventListener('click', manejarExportarZIP);
    if (btnAll) btnAll.addEventListener('click', manejarExportarTodo);
}
