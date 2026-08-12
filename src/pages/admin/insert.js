// src/pages/admin/insert.js
// Panel de administracion: CRUD de productos y piedras con Supabase.
// Usa Supabase Auth (sesion obligatoria) y Supabase Storage para imagenes.
import { supabase, STORAGE_BUCKET, publicImageUrl } from '../../lib/supabase.js';
import { optimizarImagen } from '../../lib/imageUtils.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Genera una ruta unica dentro del bucket para una imagen subida.
function storagePath(carpeta, file) {
    const ext = (file.name || '').split('.').pop() || 'jpg';
    // Tras optimizar, el MIME es webp. Forzamos .webp para coherence.
    const finalExt = file.type === 'image/webp' ? 'webp' : ext;
    return `${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${finalExt}`;
}

async function subirImagen(carpeta, file, opts = {}) {
    if (!file) throw new Error('No se proporcionó ningún archivo.');

    // 1. Optimizar imagen en el navegador (WebP + resize) antes de subir.
    const maxWidth = opts.maxWidth ?? (carpeta === 'piedras' ? 600 : 1200);
    const optimizado = await optimizarImagen(file, { maxWidth, quality: 0.82 });

    // 2. Subir a Supabase Storage.
    const path = storagePath(carpeta, optimizado);
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, optimizado, {
        cacheControl: '3600',
        upsert: false,
        contentType: optimizado.type || 'image/webp',
    });
    if (error) throw new Error(`Error al subir imagen: ${error.message}`);
    return { path, url: publicImageUrl(path) };
}

async function eliminarImagen(path) {
    if (!path) return;
    const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
    if (error) console.warn('No se pudo eliminar la imagen del Storage:', error.message);
}

// Escapa HTML para insertarlo de forma segura en las celdas de texto.
function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, '&#039;');
}

// ---------------------------------------------------------------------------
// Mensajes
// ---------------------------------------------------------------------------
function showMessage(container, msg, type) {
    container.textContent = msg;
    container.className = `message ${type}`;
    container.style.display = 'block';
}

// ---------------------------------------------------------------------------
// Plantillas de fila (modo lectura y modo edicion)
// ---------------------------------------------------------------------------

// Fila de PRODUCTO en modo lectura (texto plano, botones Editar/Eliminar).
function filaProductoHTML(p) {
    return `
        <tr data-id="${p.id}" data-image-path="${esc(p.image_path || '')}" data-image="${esc(p.image || '')}">
            <td class="celda-texto" data-field="name">${esc(p.name)}</td>
            <td class="celda-texto" data-field="description">${esc(p.description)}</td>
            <td class="celda-texto" data-field="category">${esc(p.category)}</td>
            <td class="celda-texto" data-field="material">${esc(p.material || '')}</td>
            <td><img src="${esc(p.image)}" alt="${esc(p.name)}" style="width: 50px; height: 50px; object-fit: cover;" loading="lazy" decoding="async"></td>
            <td class="col-acciones">
                <button class="btn btn-sm btn-editar" data-action="editar" data-id="${p.id}">Editar</button>
                <button class="btn-eliminar btn-sm" data-action="eliminar" data-id="${p.id}">Eliminar</button>
            </td>
        </tr>
    `;
}

// Fila de PRODUCTO en modo edicion (inputs, botones Guardar/Cancelar).
function filaProductoEditHTML(p) {
    const cats = ['collares', 'pulseras', 'pendientes', 'otros'];
    const opts = cats.map(c => `<option value="${c}" ${p.category === c ? 'selected' : ''}>${c.charAt(0).toUpperCase() + c.slice(1)}</option>`).join('');
    return `
        <tr data-id="${p.id}" data-image-path="${esc(p.image_path || '')}" data-image="${esc(p.image || '')}" data-modo="edicion">
            <td><input type="text" class="form-control form-control-sm" data-field="name" value="${esc(p.name)}"></td>
            <td><textarea class="form-control form-control-sm" data-field="description">${esc(p.description)}</textarea></td>
            <td><select class="form-select form-select-sm" data-field="category">${opts}</select></td>
            <td><input type="text" class="form-control form-control-sm" data-field="material" value="${esc(p.material || '')}"></td>
            <td><img src="${esc(p.image)}" alt="${esc(p.name)}" style="width: 50px; height: 50px; object-fit: cover;" loading="lazy" decoding="async"></td>
            <td class="col-acciones">
                <button class="btn btn-success btn-sm btn-guardar" data-action="guardar" data-id="${p.id}">Guardar</button>
                <button class="btn btn-secondary btn-sm btn-cancelar" data-action="cancelar" data-id="${p.id}">Cancelar</button>
            </td>
        </tr>
    `;
}

// Fila de PIEDRA en modo lectura.
function filaPiedraHTML(p) {
    return `
        <tr data-id="${p.id}" data-image-path="${esc(p.image_path || '')}" data-image="${esc(p.image || '')}">
            <td class="celda-texto" data-field="nombre">${esc(p.nombre)}</td>
            <td class="celda-texto" data-field="info">${esc(p.info || '')}</td>
            <td><img src="${esc(p.image)}" alt="${esc(p.nombre)}" style="width: 50px; height: 50px; object-fit: cover;" loading="lazy" decoding="async"></td>
            <td class="col-acciones">
                <button class="btn btn-sm btn-editar" data-action="editar-piedra" data-id="${p.id}">Editar</button>
                <button class="btn btn-danger btn-sm" data-action="eliminar-piedra" data-id="${p.id}">Eliminar</button>
            </td>
        </tr>
    `;
}

// Fila de PIEDRA en modo edicion.
function filaPiedraEditHTML(p) {
    return `
        <tr data-id="${p.id}" data-image-path="${esc(p.image_path || '')}" data-image="${esc(p.image || '')}" data-modo="edicion">
            <td><input type="text" class="form-control" data-field="nombre" value="${esc(p.nombre)}"></td>
            <td><textarea class="form-control form-control-sm" data-field="info">${esc(p.info || '')}</textarea></td>
            <td><img src="${esc(p.image)}" alt="${esc(p.nombre)}" style="width: 50px; height: 50px; object-fit: cover;" loading="lazy" decoding="async"></td>
            <td class="col-acciones">
                <button class="btn btn-success btn-sm btn-guardar" data-action="guardar-piedra" data-id="${p.id}">Guardar</button>
                <button class="btn btn-secondary btn-sm btn-cancelar" data-action="cancelar-piedra" data-id="${p.id}">Cancelar</button>
            </td>
        </tr>
    `;
}

// ---------------------------------------------------------------------------
// Inicializacion principal
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const messageContainer = document.getElementById('messageContainer');
    const messageProductos = document.getElementById('messageProductos');
    const messagePiedras = document.getElementById('messagePiedras');
    const message2Container = document.getElementById('message2Container');

    // Cache en memoria de las tablas (para paginar sin recargar de la BD).
    let allProductos = [];
    let allPiedras = [];

    // Paginacion.
    const PAGE_SIZE = 50;
    let productosPage = 0;
    let piedrasPage = 0;

    // Referencias DOM.
    const productosBody = document.getElementById('productos-body');
    const piedrasBody = document.getElementById('piedras-body');
    const productosPrevBtn = document.getElementById('productos-prev');
    const productosNextBtn = document.getElementById('productos-next');
    const productosPageInfo = document.getElementById('productos-page-info');
    const productosPagination = document.getElementById('productos-pagination');
    const piedrasPrevBtn = document.getElementById('piedras-prev');
    const piedrasNextBtn = document.getElementById('piedras-next');
    const piedrasPageInfo = document.getElementById('piedras-page-info');
    const piedrasPagination = document.getElementById('piedras-pagination');

    // =============================================
    // === AUTH ===
    // =============================================
    async function checkSession() {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
            window.location.href = '/insert/login.html';
            return null;
        }
        return data.session;
    }

    async function renderCurrentUser() {
        const { data } = await supabase.auth.getUser();
        const emailEl = document.getElementById('current-user-email');
        if (emailEl && data.user) emailEl.textContent = data.user.email;
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = '/insert/login.html';
        });
    }

    // =========================================================================
    // === PAGINACION ===
    // =========================================================================

    function updateProductosPagination() {
        const total = allProductos.length;
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        if (productosPage >= totalPages) productosPage = totalPages - 1;
        if (productosPage < 0) productosPage = 0;

        if (total <= PAGE_SIZE) {
            if (productosPagination) productosPagination.style.display = 'none';
        } else {
            if (productosPagination) productosPagination.style.display = 'flex';
            if (productosPrevBtn) productosPrevBtn.disabled = productosPage === 0;
            if (productosNextBtn) productosNextBtn.disabled = productosPage >= totalPages - 1;
            if (productosPageInfo) productosPageInfo.textContent = `Página ${productosPage + 1} de ${totalPages} (${total} productos)`;
        }
    }

    function updatePiedrasPagination() {
        const total = allPiedras.length;
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        if (piedrasPage >= totalPages) piedrasPage = totalPages - 1;
        if (piedrasPage < 0) piedrasPage = 0;

        if (total <= PAGE_SIZE) {
            if (piedrasPagination) piedrasPagination.style.display = 'none';
        } else {
            if (piedrasPagination) piedrasPagination.style.display = 'flex';
            if (piedrasPrevBtn) piedrasPrevBtn.disabled = piedrasPage === 0;
            if (piedrasNextBtn) piedrasNextBtn.disabled = piedrasPage >= totalPages - 1;
            if (piedrasPageInfo) piedrasPageInfo.textContent = `Página ${piedrasPage + 1} de ${totalPages} (${total} piedras)`;
        }
    }

    // Renderiza SOLO las filas de la pagina actual de productos.
    function renderProductosPage() {
        const start = productosPage * PAGE_SIZE;
        const slice = allProductos.slice(start, start + PAGE_SIZE);
        productosBody.innerHTML = slice.map(filaProductoHTML).join('');
        updateProductosPagination();
    }

    function renderPiedrasPage() {
        const start = piedrasPage * PAGE_SIZE;
        const slice = allPiedras.slice(start, start + PAGE_SIZE);
        piedrasBody.innerHTML = slice.map(filaPiedraHTML).join('');
        updatePiedrasPagination();
    }

    // Listeners de paginacion (una sola asignacion).
    if (productosPrevBtn) productosPrevBtn.addEventListener('click', () => {
        if (productosPage > 0) { productosPage--; renderProductosPage(); }
    });
    if (productosNextBtn) productosNextBtn.addEventListener('click', () => {
        if ((productosPage + 1) * PAGE_SIZE < allProductos.length) { productosPage++; renderProductosPage(); }
    });
    if (piedrasPrevBtn) piedrasPrevBtn.addEventListener('click', () => {
        if (piedrasPage > 0) { piedrasPage--; renderPiedrasPage(); }
    });
    if (piedrasNextBtn) piedrasNextBtn.addEventListener('click', () => {
        if ((piedrasPage + 1) * PAGE_SIZE < allPiedras.length) { piedrasPage++; renderPiedrasPage(); }
    });

    // Carga inicial de las tablas (UNA sola consulta por coleccion).
    async function cargarProductos() {
        const { data, error } = await supabase
            .from('productos')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) {
            console.error('Error al cargar productos:', error);
            showMessage(messageProductos, 'Error al cargar productos.', 'error');
            return;
        }
        allProductos = data || [];
        productosPage = 0;
        renderProductosPage();
    }

    async function cargarPiedras() {
        const { data, error } = await supabase
            .from('piedras')
            .select('*')
            .order('nombre', { ascending: true });
        if (error) {
            console.error('Error al cargar piedras:', error);
            showMessage(messagePiedras, 'Error al cargar piedras.', 'error');
            return;
        }
        allPiedras = data || [];
        piedrasPage = 0;
        renderPiedrasPage();
    }

    // =========================================================================
    // === EVENT DELEGATION (un solo listener por tbody) ===
    // =========================================================================

    // Encuentra la accion y el id a partir del evento click.
    function despacharClick(e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return null;
        return { action: btn.dataset.action, id: btn.dataset.id, btn };
    }

    // Lee los valores de los inputs/textareas dentro de una fila en modo edicion.
    function leerValoresEdicion(tr) {
        const out = {};
        tr.querySelectorAll('[data-field]').forEach(el => {
            out[el.dataset.field] = el.value;
        });
        return out;
    }

    // --------- Productos: delegation ---------
    productosBody.addEventListener('click', async (e) => {
        const d = despacharClick(e);
        if (!d) return;
        const tr = productosBody.querySelector(`tr[data-id="${d.id}"]`);
        if (!tr) return;

        if (d.action === 'editar') {
            const p = allProductos.find(x => x.id === d.id);
            if (p) tr.outerHTML = filaProductoEditHTML(p);
            return;
        }

        if (d.action === 'cancelar') {
            const p = allProductos.find(x => x.id === d.id);
            if (p) tr.outerHTML = filaProductoHTML(p);
            return;
        }

        if (d.action === 'guardar') {
            const valores = leerValoresEdicion(tr);
            if (!valores.name?.trim() || !valores.description?.trim() || !valores.category?.trim()) {
                showMessage(messageProductos, 'Por favor, completa todos los campos.', 'error');
                return;
            }
            try {
                const { error } = await supabase
                    .from('productos')
                    .update({
                        name: valores.name,
                        description: valores.description,
                        category: valores.category,
                        material: valores.material || null,
                    })
                    .eq('id', d.id);
                if (error) throw error;

                // Actualizar cache en memoria y la fila (sin recargar la BD).
                const idx = allProductos.findIndex(x => x.id === d.id);
                if (idx >= 0) allProductos[idx] = { ...allProductos[idx], ...valores };
                tr.outerHTML = filaProductoHTML(allProductos[idx]);
                showMessage(messageProductos, 'Producto actualizado con éxito.', 'success');
            } catch (err) {
                console.error('Error al actualizar:', err);
                showMessage(messageProductos, 'Error al actualizar. Revisa la consola.', 'error');
            }
            return;
        }

        if (d.action === 'eliminar') {
            if (!confirm('¿Estás seguro de que deseas eliminar este producto?')) return;
            try {
                const imagePath = tr.dataset.imagePath;
                await eliminarImagen(imagePath);
                const { error } = await supabase.from('productos').delete().eq('id', d.id);
                if (error) throw error;

                // Eliminar del cache y del DOM sin re-render total.
                allProductos = allProductos.filter(x => x.id !== d.id);
                tr.remove();
                updateProductosPagination();
                showMessage(messageProductos, 'Producto eliminado con éxito.', 'success');
            } catch (err) {
                console.error('Error al eliminar:', err);
                showMessage(messageProductos, 'Error al eliminar. Revisa la consola.', 'error');
            }
        }
    });

    // --------- Piedras: delegation ---------
    piedrasBody.addEventListener('click', async (e) => {
        const d = despacharClick(e);
        if (!d) return;
        const tr = piedrasBody.querySelector(`tr[data-id="${d.id}"]`);
        if (!tr) return;

        if (d.action === 'editar-piedra') {
            const p = allPiedras.find(x => x.id === d.id);
            if (p) tr.outerHTML = filaPiedraEditHTML(p);
            return;
        }

        if (d.action === 'cancelar-piedra') {
            const p = allPiedras.find(x => x.id === d.id);
            if (p) tr.outerHTML = filaPiedraHTML(p);
            return;
        }

        if (d.action === 'guardar-piedra') {
            const valores = leerValoresEdicion(tr);
            if (!valores.nombre?.trim() || !valores.info?.trim()) {
                showMessage(messagePiedras, 'Por favor, completa todos los campos.', 'error');
                return;
            }
            try {
                const { error } = await supabase
                    .from('piedras')
                    .update({ nombre: valores.nombre, info: valores.info })
                    .eq('id', d.id);
                if (error) throw error;

                const idx = allPiedras.findIndex(x => x.id === d.id);
                if (idx >= 0) allPiedras[idx] = { ...allPiedras[idx], ...valores };
                tr.outerHTML = filaPiedraHTML(allPiedras[idx]);
                showMessage(messagePiedras, 'Piedra actualizada con éxito.', 'success');
            } catch (err) {
                console.error('Error al actualizar piedra:', err);
                showMessage(messagePiedras, 'Error al actualizar. Revisa la consola.', 'error');
            }
            return;
        }

        if (d.action === 'eliminar-piedra') {
            if (!confirm('¿Estás seguro de que deseas eliminar esta piedra?')) return;
            try {
                const imagePath = tr.dataset.imagePath;
                await eliminarImagen(imagePath);
                const { error } = await supabase.from('piedras').delete().eq('id', d.id);
                if (error) throw error;

                allPiedras = allPiedras.filter(x => x.id !== d.id);
                tr.remove();
                updatePiedrasPagination();
                showMessage(messagePiedras, 'Piedra eliminada con éxito.', 'success');
            } catch (err) {
                console.error('Error al eliminar piedra:', err);
                showMessage(messagePiedras, 'Error al eliminar. Revisa la consola.', 'error');
            }
        }
    });

    // =========================================================================
    // === FORMULARIOS: alta (con prepend de la fila nueva) ===
    // =========================================================================

    // ---- Productos ----
    const productForm = document.getElementById('productForm');
    const productImageInput = document.getElementById('productImage');

    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showMessage(messageContainer, '', '');
        messageContainer.style.display = 'none';

        const productName = document.getElementById('productName').value;
        const productDescription = document.getElementById('productDescription').value;
        const productCategory = document.getElementById('productCategory').value;
        const productMaterial = document.getElementById('productMaterial').value;
        const imageFile = productImageInput.files[0];

        if (!productName || !productDescription || !imageFile || !productCategory || !productMaterial) {
            showMessage(messageContainer, 'Por favor, completa todos los campos.', 'error');
            return;
        }

        try {
            showMessage(messageContainer, 'Subiendo imagen y añadiendo producto...', 'success');
            messageContainer.style.color = '#155724';

            const { path, url } = await subirImagen('productos', imageFile);

            const { data, error } = await supabase
                .from('productos')
                .insert({
                    name: productName,
                    description: productDescription,
                    image: url,
                    image_path: path,
                    category: productCategory,
                    material: productMaterial,
                })
                .select()
                .single();

            if (error) {
                await eliminarImagen(path);
                throw error;
            }

            // Prepend en cache y en DOM (sin re-render total).
            allProductos.unshift(data);
            productosPage = 0;
            renderProductosPage();

            showMessage(messageContainer, 'Producto añadido con éxito!', 'success');
            messageContainer.style.color = '';
            productForm.reset();
        } catch (error) {
            console.error("Error al añadir el producto:", error);
            showMessage(messageContainer, 'Error al añadir el producto. Revisa la consola.', 'error');
        }
    });

    // ---- Piedras ----
    const piedrasForm = document.getElementById('piedrasForm');
    const piedraImageInput = document.getElementById('piedraImage');

    piedrasForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showMessage(message2Container, '', '');
        message2Container.style.display = 'none';

        const nombrePiedra = document.getElementById('nombrePiedra').value;
        const infoPiedra = document.getElementById('infoPiedra').value;
        const piedraImageFile = piedraImageInput.files[0];

        if (!nombrePiedra || !infoPiedra || !piedraImageFile) {
            showMessage(message2Container, 'Por favor, completa todos los campos.', 'error');
            return;
        }

        try {
            showMessage(message2Container, 'Subiendo imagen de la piedra...', 'success');
            message2Container.style.color = '#155724';

            const { path, url } = await subirImagen('piedras', piedraImageFile);

            const { data, error } = await supabase
                .from('piedras')
                .insert({
                    nombre: nombrePiedra,
                    info: infoPiedra,
                    image: url,
                    image_path: path,
                })
                .select()
                .single();

            if (error) {
                await eliminarImagen(path);
                throw error;
            }

            // Insertar en cache en orden alfabetico; si cae en la pagina actual, re-render.
            allPiedras.push(data);
            allPiedras.sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));

            // Recalcular pagina actual: si la nueva entra en la pagina 0, re-render.
            const idx = allPiedras.findIndex(x => x.id === data.id);
            const paginaNueva = Math.floor(idx / PAGE_SIZE);
            if (paginaNueva === piedrasPage) {
                renderPiedrasPage();
            } else {
                piedrasPage = 0;
                renderPiedrasPage();
            }

            showMessage(message2Container, 'Piedra añadida con éxito!', 'success');
            message2Container.style.color = '';
            piedrasForm.reset();
        } catch (error) {
            console.error("Error al añadir la piedra:", error);
            showMessage(message2Container, 'Error al añadir la piedra. Revisa la consola.', 'error');
        }
    });

    // =========================================================================
    // === INICIALIZACION ===
    // =========================================================================
    checkSession().then((session) => {
        if (!session) return;
        renderCurrentUser();
        cargarProductos();
        cargarPiedras();
    });
});