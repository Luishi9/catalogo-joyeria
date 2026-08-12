// src/lib/supabase.js
// Cliente Supabase unico del proyecto.
// Las variables se inyectan por Vite desde .env (prefijo VITE_).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Faltan variables de Supabase. Revisa tu archivo .env (copia .env.example a .env).'
  );
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');

export const STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_BUCKET || 'imagenes-joyeria';

// Helper para construir la URL publica de un archivo del bucket.
// `path` ej: "productos/prueba.jpg" -> URL publica del storage.
export function publicImageUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}