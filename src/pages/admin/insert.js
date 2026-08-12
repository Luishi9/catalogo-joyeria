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

// ---------------------------------------------------------------------------
// Mensajes
// ---------------------------------------------------------------------------
function showMessage(container, msg, type) {
    container.textContent = msg;
    container.className = `message ${type}`;
    container.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', () => {
    const messageContainer = document.getElementById('messageContainer');
    const messageProductos = document.getElementById('messageProductos');
    const messagePiedras = document.getElementById('messagePiedras');
    const message2Container = document.getElementById('message2Container');

    // =============================================
    // === AUTH: si no hay sesion, ir a login ===
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

    // =============================================
    // === PRODUCTOS ===
    // =============================================
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

            // 1. Subir imagen a Supabase Storage
            const { path, url } = await subirImagen('productos', imageFile);

            // 2. Insertar fila en la tabla productos
            const { error } = await supabase
                .from('productos')
                .insert({
                    name: productName,
                    description: productDescription,
                    image: url,
                    image_path: path,
                    category: productCategory,
                    material: productMaterial,
                });

            if (error) {
                await eliminarImagen(path); // rollback: limpiar imagen si falla el insert
                throw error;
            }

            showMessage(messageContainer, 'Producto añadido con éxito!', 'success');
            messageContainer.style.color = '';
            productForm.reset();
            renderProductosTable();
        } catch (error) {
            console.error("Error al añadir el producto:", error);
            showMessage(messageContainer, 'Error al añadir el producto. Revisa la consola.', 'error');
        }
    });

    async function renderProductosTable() {
        const tableBody = document.querySelector("#productos-table tbody");
        tableBody.innerHTML = '';

        const { data: rows, error } = await supabase
            .from('productos')
            .select('*');

        if (error) {
            console.error('Error al cargar productos:', error);
            showMessage(messageProductos, 'Error al cargar productos.', 'error');
            return;
        }

        (rows || []).forEach((producto) => {
            const productoId = producto.id;
            const row = document.createElement("tr");

            row.innerHTML = `
            <td>
                <textarea id="name-input-${productoId}" class="form-control form-control-sm">${producto.name}</textarea>
            </td>
            <td>
                <textarea id="description-input-${productoId}" class="form-control form-control-sm">${producto.description}</textarea>
            </td>
            <td>
                 <select id="category-input-${productoId}" class="form-select form-select-sm">
                    <option value="collares" ${producto.category === 'collares' ? 'selected' : ''}>Collares</option>
                    <option value="pulseras" ${producto.category === 'pulseras' ? 'selected' : ''}>Pulseras</option>
                    <option value="pendientes" ${producto.category === 'pendientes' ? 'selected' : ''}>Pendientes</option>
                    <option value="otros" ${producto.category === 'otros' ? 'selected' : ''}>Otros</option>
                </select>                
            </td>
            <td>
                <input type="text" id="material-input-${productoId}" value="${producto.material || ''}" class="form-control form-control-sm">
            </td>
            <td><img src="${producto.image}" alt="${producto.name}" style="width: 50px; height: auto;"></td>   

            <td>
                <button class="btn btn-success btn-sm btn-actualizar" data-id="${productoId}">Actualizar</button>
                <button class="btn-eliminar btn-sm" data-id="${productoId}">Eliminar</button>
            </td>
        `;

            tableBody.appendChild(row);
        });

        // Eventos de eliminar
        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;

                if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
                    try {
                        // 1. Obtener la fila para conocer la ruta de la imagen
                        const { data: fila } = await supabase
                            .from('productos')
                            .select('image_path')
                            .eq('id', id)
                            .single();

                        // 2. Eliminar la imagen del Storage (si hay ruta)
                        await eliminarImagen(fila?.image_path);

                        // 3. Eliminar la fila
                        const { error } = await supabase.from('productos').delete().eq('id', id);
                        if (error) throw error;

                        showMessage(messageProductos, 'Producto y su imagen eliminados con éxito.', 'success');
                        renderProductosTable();
                    } catch (firestoreError) {
                        console.error("Error al eliminar el producto:", firestoreError);
                        showMessage(messageProductos, 'Error al eliminar el producto. Revisa la consola.', 'error');
                    }
                }
            });
        });

        // Eventos de actualizar
        document.querySelectorAll('.btn-actualizar').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;

                const newName = document.getElementById(`name-input-${id}`).value;
                const newDescription = document.getElementById(`description-input-${id}`).value;
                const newCategory = document.getElementById(`category-input-${id}`).value;
                const newMaterial = document.getElementById(`material-input-${id}`).value;

                if (!newName.trim() || !newDescription.trim() || !newCategory.trim()) {
                    showMessage(messageProductos, 'Por favor, completa todos los campos de forma correcta.', 'error');
                    return;
                }

                try {
                    const { error } = await supabase
                        .from('productos')
                        .update({
                            name: newName,
                            description: newDescription,
                            category: newCategory,
                            material: newMaterial,
                        })
                        .eq('id', id);

                    if (error) throw error;

                    showMessage(messageProductos, 'Producto actualizado con éxito.', 'success');
                } catch (error) {
                    console.error("Error al actualizar el producto:", error);
                    showMessage(messageProductos, 'Error al actualizar el producto. Revisa la consola.', 'error');
                }
            });
        });
    }

    // =============================================
    // === PIEDRAS ===
    // =============================================
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

            // 1. Subir imagen a Supabase Storage
            const { path, url } = await subirImagen('piedras', piedraImageFile);

            // 2. Insertar fila en la tabla piedras
            const { error } = await supabase
                .from('piedras')
                .insert({
                    nombre: nombrePiedra,
                    info: infoPiedra,
                    image: url,
                    image_path: path,
                });

            if (error) {
                await eliminarImagen(path); // rollback
                throw error;
            }

            showMessage(message2Container, 'Piedra añadida con éxito!', 'success');
            message2Container.style.color = '';
            piedrasForm.reset();
            renderPiedrasTable();
        } catch (error) {
            console.error("Error al añadir la piedra:", error);
            showMessage(message2Container, 'Error al añadir la piedra. Revisa la consola.', 'error');
        }
    });

    async function renderPiedrasTable() {
        const piedrasTableBody = document.querySelector("#piedras-table tbody");
        piedrasTableBody.innerHTML = '';

        try {
            const { data: rows, error } = await supabase
                .from('piedras')
                .select('*')
                .order('nombre', { ascending: true });

            if (error) throw error;

            (rows || []).forEach((piedra) => {
                const piedraId = piedra.id;
                const row = document.createElement("tr");

                row.innerHTML = `
                <td>
                    <input type="text" id="nombre-input-${piedraId}" value="${piedra.nombre}" class="form-control">
                </td>
                <td>
                    <textarea id="info-input-${piedraId}" class="form-control form-control-sm">${piedra.info}</textarea>
                </td>
                <td><img src="${piedra.image}" alt="${piedra.nombre}" style="width: 50px; height: auto;"></td>          
                <td>
                    <button class="btn btn-success btn-sm btn-actualizar-piedra" data-id="${piedraId}">Actualizar</button>
                    <button class="btn btn-danger btn-sm btn-eliminar-piedra" data-id="${piedraId}">Eliminar</button>
                </td>
            `;

                piedrasTableBody.appendChild(row);
            });
        } catch (error) {
            console.error("Error al obtener piedras desde Supabase:", error);
            showMessage(messagePiedras, 'Error al cargar piedras.', 'error');
        }

        // Eventos de eliminar piedra
        document.querySelectorAll('.btn-eliminar-piedra').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;

                if (confirm('¿Estás seguro de que deseas eliminar esta piedra?')) {
                    try {
                        // 1. Obtener la ruta de imagen
                        const { data: fila } = await supabase
                            .from('piedras')
                            .select('image_path')
                            .eq('id', id)
                            .single();

                        // 2. Eliminar la imagen del Storage
                        await eliminarImagen(fila?.image_path);

                        // 3. Eliminar la fila
                        const { error } = await supabase.from('piedras').delete().eq('id', id);
                        if (error) throw error;

                        showMessage(messagePiedras, 'Piedra y su imagen eliminadas con éxito.', 'success');
                        renderPiedrasTable();
                    } catch (firestoreError) {
                        console.error("Error al eliminar la piedra:", firestoreError);
                        showMessage(messagePiedras, 'Error al eliminar la piedra. Revisa la consola.', 'error');
                    }
                }
            });
        });

        // Eventos de actualizar piedra
        document.querySelectorAll('.btn-actualizar-piedra').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;

                const nuevoNombre = document.getElementById(`nombre-input-${id}`).value;
                const nuevaInfo = document.getElementById(`info-input-${id}`).value;

                if (!nuevoNombre.trim() || !nuevaInfo.trim()) {
                    showMessage(messagePiedras, 'Por favor, completa todos los campos.', 'error');
                    return;
                }

                try {
                    const { error } = await supabase
                        .from('piedras')
                        .update({ nombre: nuevoNombre, info: nuevaInfo })
                        .eq('id', id);

                    if (error) throw error;

                    showMessage(messagePiedras, 'Piedra actualizada con éxito.', 'success');
                } catch (error) {
                    console.error("Error al actualizar la piedra:", error);
                    showMessage(messagePiedras, 'Error al actualizar la piedra. Revisa la consola.', 'error');
                }
            });
        });
    }

    // =============================================
    // === INICIALIZACION ===
    // =============================================
    checkSession().then((session) => {
        if (!session) return;
        renderCurrentUser();
        renderProductosTable();
        renderPiedrasTable();
    });
});