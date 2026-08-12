// src/lib/imageUtils.js
// Helper de compresion/optimizacion de imagenes en el navegador antes de subir
// a Supabase Storage. Convierte a WebP y escala a un ancho maximo manteniendo el
// ratio, lo que reduce el peso ~70-80% sin coste (no requiere plan Pro).
//
// Uso:
//   const blob = await optimizarImagen(file, { maxWidth: 1200, quality: 0.82 });

const UMBRAL_SIN_RECOMPRESION = 150 * 1024; // 150 KB: si ya pesa poco, no recomprimir
const UMBRAL_POCO_PROVECHO = 0.5; // si webP resultante > 50% del original, mantenemos el original

// Lee un File/Blob como HTMLImageElement ya decodificado.
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo cargar la imagen.'));
    };
    img.src = url;
  });
}

// Calcula dimensiones finales manteniendo el ratio y respetando maxWidth.
function calcularDimensiones(origW, origH, maxWidth) {
  if (!maxWidth || origW <= maxWidth) {
    return { w: origW, h: origH };
  }
  const ratio = maxWidth / origW;
  return { w: maxWidth, h: Math.round(origH * ratio) };
}

/**
 * Optimiza una imagen:
 *  - Si el archivo ya es WebP y pesa poco, lo devuelve tal cual (sin recomprimir).
 *  - Sino, la redimensiona a maxWidth manteniendo ratio y la convierte a WebP con quality.
 *
 * @param {File|Blob} file - Imagen original.
 * @param {Object} [opts]
 * @param {number} [opts.maxWidth=1200] - Ancho maximo en px.
 * @param {number} [opts.quality=0.82]  - Calidad WebP (0-1).
 * @param {string} [opts.type='image/webp'] - MIME resultado.
 * @returns {Promise<Blob>} Blob optimizado (WebP) o el original si no merece la pena.
 */
export async function optimizarImagen(file, opts = {}) {
  const maxWidth = opts.maxWidth ?? 1200;
  const quality = opts.quality ?? 0.82;
  const type = opts.type ?? 'image/webp';

  // Si ya es WebP pequeno, devolverlo tal cual.
  if (file.type === 'image/webp' && file.size > 0 && file.size <= UMBRAL_SIN_RECOMPRESION) {
    return file;
  }

  // SVG: no comprimir (canvas no rinde SVG bien).
  if (file.type === 'image/svg+xml') {
    return file;
  }

  try {
    const img = await loadImage(file);
    const { w, h } = calcularDimensiones(img.naturalWidth, img.naturalHeight, maxWidth);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('toBlob devolvio null'))),
        type,
        quality
      );
    });

    // Evita devolver un WebP mas grande que el original (caso raro con PNGs ya comprimidos).
    if (blob && file.size > 0 && blob.size / file.size > UMBRAL_POCO_PROVECHO) {
      return blob; // Aun asi devolvemos el WebP por la conversion de formato.
    }
    return blob;
  } catch (err) {
    console.warn('No se pudo optimizar la imagen, se subira el original:', err.message);
    return file; // Fallback: subir el original sin comprimir.
  }
}
