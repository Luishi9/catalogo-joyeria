// src/insert/script.js

// Importa db desde la carpeta superior
import { db } from '../db.js';

// Importa las funciones necesarias de Firestore
import { collection, addDoc, getDocs, deleteDoc, doc, getDoc, updateDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

// IMPORTA LAS FUNCIONES NECESARIAS DE FIREBASE STORAGE
//import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-storage.js"; 
// Obtener la instancia de Storage
//const storage = getStorage(db.app); // Asumiendo que 'db' tiene una propiedad 'app' que es la instancia de Firebase App.
// Si db.js solo exporta 'db', necesitarás importar 'app' desde db.js también.


// ===============================================
// === CONFIGURACIÓN DE IMGBB (Añade estas líneas) ===
// ===============================================
const IMGBB_API_KEY = 'e56d73915e78e9f0acb547eb833f7d6d'; // <--- ¡REEMPLAZA CON TU API KEY REAL!
const IMGBB_UPLOAD_URL = `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`;

const IMGBB_DELETE_API_ENDPOINT = `https://api.imgbb.com/1/delete`; // Sin el hash o la clave aquí
// ===============================================

document.addEventListener('DOMContentLoaded', () => {
    const productForm = document.getElementById('productForm');
    const messageContainer = document.getElementById('messageContainer');
    const productImageInput = document.getElementById('productImage'); // Referencia al input de tipo file

    productForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Previene el envío tradicional del formulario

        // Limpia cualquier mensaje anterior
        messageContainer.style.display = 'none';
        messageContainer.textContent = '';
        messageContainer.className = 'message'; // Resetea clases

        // Recopila los datos del formulario
        const productName = document.getElementById('productName').value;
        const productDescription = document.getElementById('productDescription').value;
        const productPrice = parseFloat(document.getElementById('productPrice').value);
        const productCategory = document.getElementById('productCategory').value;
        const productMaterial = document.getElementById('productMaterial').value;

        const imageFile = productImageInput.files[0]; // Obtiene el archivo de imagen seleccionado

        // Validaciones básicas (puedes añadir más)
        if (!productName || !productDescription || isNaN(productPrice) || !imageFile || !productCategory || !productMaterial) {
            showMessage('Por favor, completa todos los campos.', 'error');
            return;
        }

        try {

            showMessage('Subiendo imagen y añadiendo producto...', 'info'); // Mensaje de carga

            // 1. Subir la imagen a Imgbb
            const formData = new FormData();
            formData.append('image', imageFile); // 'image' es el nombre del campo que Imgur espera

            //Sube el archivo
            const imgbbResponse = await fetch(IMGBB_UPLOAD_URL, {
                method: 'POST',
                body: formData // Envía el archivo como FormData
            });

            const imgbbData = await imgbbResponse.json();

            if (!imgbbResponse.ok || !imgbbData.success) {
                console.error("Error al subir la imagen a ImgBB:", imgbbData);
                // Intenta obtener un mensaje de error más específico de ImgBB
                const errorMessage = imgbbData.error?.message || imgbbData.data?.error?.message || 'Error desconocido al subir la imagen a ImgBB.';
                throw new Error(errorMessage);
            }

            const imageUrl = imgbbData.data.url; // La URL de la imagen está en imgbbData.data.url
            const imageId = imgbbData.data.id; // Obtener el ID de la imagen
            let imageDeleteToken; // Usaremos 'imageDeleteToken' para ser consistentes con la doc

            // --- PARA EL FORMULARIO DE PRODUCTOS ---
            if (imgbbData.data.delete_url) {
                // Extrae el delete_token de la delete_url
                const deleteUrlParts = imgbbData.data.delete_url.split('/');
                imageDeleteToken = deleteUrlParts[deleteUrlParts.length - 1]; // El último segmento es el token
                console.log('Imagen subida a ImgBB. ID:', imageId, 'Token:', imageDeleteToken);
            } else {
                console.error("Error: ImgBB no proporcionó una delete_url válida para el producto.");
                throw new Error("La imagen se subió, pero no se pudo obtener el token de eliminación de ImgBB para el producto.");
            }

            // Añade el documento a la colección "productos" en Firestore
            const docRef = await addDoc(collection(db, "productos"), {
                name: productName,
                description: productDescription,
                price: productPrice,
                image: imageUrl, // Usa la URL de la imagen subida
                imageId: imageId, // ¡Guardar el ID!
                imageDeleteToken: imageDeleteToken, // ¡Guardar el Token!
                category: productCategory,
                material: productMaterial,
                createdAt: new Date() // Opcional: marca de tiempo de creación
            });

            console.log("Producto añadido con ID: ", docRef.id);
            showMessage('Producto añadido con éxito!', 'success');
            productForm.reset(); // Limpia el formulario después de la inserción
            renderProductosTable(); // Recargar la tabla

        } catch (error) {
            console.error("Error al añadir el producto:", error);
            showMessage('Error al añadir el producto. Revisa la consola.', 'error');
        }
    });

    function showMessage(msg, type) {
        messageContainer.textContent = msg;
        messageContainer.classList.add(type);
        messageContainer.style.display = 'block';
    }

    function showMessageProductos(msg, type) {
        messageProductos.textContent = msg;
        messageProductos.classList.add(type);
        messageProductos.style.display = 'block';
    }

     function showMessagePiedras(msg, type) {
        messagePiedras.textContent = msg;
        messagePiedras.classList.add(type);
        messagePiedras.style.display = 'block';
    }

    async function renderProductosTable() {
        const tableBody = document.querySelector("#productos-table tbody");
        tableBody.innerHTML = ''; // Limpiar tabla

        const querySnapshot = await getDocs(collection(db, "productos"));
        querySnapshot.forEach((documento) => {
            const producto = documento.data();
            const productoId = documento.id; // Obtener el ID del documento
            const row = document.createElement("tr");

            row.innerHTML = `
            <td>
                <textarea id="name-input-${productoId}" class="form-control form-control-sm">${producto.name}</textarea>
            </td>
            <td>
                <textarea id="description-input-${productoId}" class="form-control form-control-sm">${producto.description}</textarea>
            </td>
            <td class="price-cell">
                <input type="number"
                       id="price-input-${productoId}"
                       value="${parseFloat(producto.price).toFixed(2)}"
                       step="0.01"
                       min="0"
                       class="form-control form-control-sm"
                       style="width: 100px; display: inline-block;">
                <button class="btn btn-primary btn-sm btn-guardar-precio"
                       data-id="${productoId}"
                       style="margin-left: 5px;">Guardar</button>
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

        // Agregar evento a cada botón de eliminar
        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;

                if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {

                    try {
                        // 1. Obtener el documento de firestore para obtener el hash de eliminación
                        const docRef = doc(db, "productos", id);
                        const docSnap = await getDoc(docRef);

                        if (docSnap.exists()) {
                            const productoData = docSnap.data();
                            const imageId = productoData.imageId; // Obtener el ID
                            const imageDeleteToken = productoData.imageDeleteToken; // Obtener el Token

                            if (imageId && imageDeleteToken) {
                                // 2. eliminar la iamgen de ImgBB
                                try {
                                    // CONSTRUCCIÓN CORRECTA DE LA URL DE ELIMINACIÓN SEGÚN LA NUEVA DOC
                                    const deleteImgbbResponse = await fetch(`https://api.imgbb.com/1/delete/${imageId}/${imageDeleteToken}?key=${IMGBB_API_KEY}`, {
                                        method: 'GET' // ¡CAMBIO CRUCIAL: AHORA ES GET!
                                    });
                                    const deleteImgbbData = await deleteImgbbResponse.json();

                                    if (deleteImgbbResponse.ok && deleteImgbbData.success) {
                                        console.log("Imagen eliminada de ImgBB exitosamente.");
                                    } else {
                                        console.warn("Error al eliminar la imagen de ImgBB:", deleteImgbbData);
                                    }
                                } catch (imgbbError) {
                                    console.log("Error de red al intentar eliminar la imagen de ImgBB:", imgbbError);
                                }
                            } else {
                                console.warn("No se encontró el delete hash de la imagen para eliminarla de ImgBB.");
                            }
                        } else {
                            console.warn("Documento no encontreado en Firestore para eliminar la imagen asociada.");
                        }

                        // 3. Eliminar el documento de Firestore
                        await deleteDoc(doc(db, "productos", id));
                        showMessageProductos('Producto y su imagen (si existía) eliminados con éxito.', 'success');
                        renderProductosTable(); // Volver a cargar tabla

                    } catch (firestoreError) {
                        console.error("Error al eliminar el producto de firestore:", firestoreError);
                        showMessageProductos('Error al eliminar el producto. Revisa la consola.', 'error');
                        return;
                    }

                }
            });
        });

        // =======================================================
        // Agregar evento a cada botón de guardar precio
        // =======================================================
        document.querySelectorAll('.btn-guardar-precio').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                const priceInput = document.getElementById(`price-input-${id}`);
                const newPrice = parseFloat(priceInput.value);

                if (isNaN(newPrice) || newPrice < 0) {
                    alert('Por favor, ingresa un precio válido.');
                    return;
                }

                try {
                    // Actualizar el precio en Firestore
                    const docRef = doc(db, "productos", id);
                    await updateDoc(docRef, {
                        price: newPrice // Actualzar el precio
                    });

                    showMessageProductos('Precio actualizado con éxito.', 'success');
                    renderProductosTable(); // Volver a cargar tabla

                } catch (error) {
                    console.error("Error al actualizar el precio:", error);
                    showMessageProductos('Error al actualizar el precio. Revisa la consola.', 'error');
                }
            });
        });

        // =======================================================
        // Agregar evento a cada botón de actualizar
        // =======================================================
        document.querySelectorAll('.btn-actualizar').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;

                // Obtener los valores de los inputs
                const newName = document.getElementById(`name-input-${id}`).value;
                const newDescription = document.getElementById(`description-input-${id}`).value;
                const newPrice = parseFloat(document.getElementById(`price-input-${id}`).value);
                const newCategory = document.getElementById(`category-input-${id}`).value;
                const newMaterial = document.getElementById(`material-input-${id}`).value;

                // Validar los datos
                if (isNaN(newPrice) || newPrice < 0 || !newName.trim() || !newDescription.trim() || !newCategory.trim()) {
                    showMessageProductos('Por favor, completa todos los campos de forma correcta.', 'error');
                    return;
                }

                try {
                    // Referencia al documento en Firestore
                    const docRef = doc(db, "productos", id);

                    // Objeto con los datos a actualizar
                    const updatedData = {
                        name: newName,
                        description: newDescription,
                        price: newPrice,
                        category: newCategory,
                        material: newMaterial
                    };

                    // Usar updateDoc para actualizar los campos
                    await updateDoc(docRef, updatedData);

                    showMessageProductos('Producto actualizado con éxito.', 'success');
                    // Opcional: Volver a cargar la tabla para reflejar los cambios
                    // renderProductosTable();
                } catch (error) {
                    console.error("Error al actualizar el producto:", error);
                    showMessageProductos('Error al actualizar el producto. Revisa la consola.', 'error');
                }
            });
        });
    }

    // Manejo del formulario de piedras
    // Referencias a los elementos del formulario de piedras
    const piedrasForm = document.getElementById('piedrasForm');
    const piedraImageInput = document.getElementById('piedraImage'); // Referencia al input de tipo file para piedras
    const message2Container = document.getElementById('message2Container');

    piedrasForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Previene el envío tradicional del formulario

        // Limpia cualquier mensaje anterior
        message2Container.style.display = 'none';
        message2Container.textContent = '';
        message2Container.className = 'message'; // Resetea clases

        // Recopila los datos del formulario
        const nombrePiedra = document.getElementById('nombrePiedra').value; // Obtiene el nombre de la piedra
        const infoPiedra = document.getElementById('infoPiedra').value;

        const piedraImageFile = piedraImageInput.files[0]; // Obtiene el archivo de imagen seleccionado

        // Validaciones básicas (puedes añadir más)
        if (!nombrePiedra || !infoPiedra || !piedraImageFile) {
            showMessage2('Por favor, completa todos los campos.', 'error');
            return;
        }
        try {
            showMessage2('Subiendo imagen de la piedra...', 'info'); // Mensaje de carga

            // 1. Subir la imagen a Imgbb
            const formData = new FormData();
            formData.append('image', piedraImageFile); // 'image' es el nombre del campo que Imgbb espera

            //Sube el archivo
            const imgbbResponse = await fetch(IMGBB_UPLOAD_URL, {
                method: 'POST',
                body: formData // Envía el archivo como FormData
            });

            const imgbbData = await imgbbResponse.json();

            if (!imgbbResponse.ok || !imgbbData.success) {
                console.error("Error al subir la imagen a ImgBB:", imgbbData);
                // Intenta obtener un mensaje de error más específico de ImgBB
                const errorMessage = imgbbData.error?.message || imgbbData.data?.error?.message || 'Error desconocido al subir la imagen a ImgBB.';
                throw new Error(errorMessage);
            }

            const imageUrl = imgbbData.data.url; // La URL de la imagen está en imgbbData.data.url
            const imageId = imgbbData.data.id; // Obtener el ID de la imagen de la piedra

            let piedraImageDeleteToken; // Usaremos 'piedraImageDeleteToken'

            if (imgbbData.data.delete_url) {
                const deleteUrlParts = imgbbData.data.delete_url.split('/');
                piedraImageDeleteToken = deleteUrlParts[deleteUrlParts.length - 1];
                console.log('Imagen de piedra subida a ImgBB. ID:', imageId, 'Token:', piedraImageDeleteToken);
            } else {
                console.error("Error: ImgBB no proporcionó una delete_url válida para la piedra.");
                throw new Error("La imagen de la piedra se subió, pero no se pudo obtener el token de eliminación de ImgBB.");
            }

            console.log('Imagen subida a ImgBB, URL:', imageUrl);

            // Añade el documento a la colección "piedras" en Firestore
            const docRef = await addDoc(collection(db, "piedras"), {
                nombre: nombrePiedra, // Usa el nombre de la piedra
                info: infoPiedra,
                image: imageUrl, // Usa la URL de la imagen subida
                imageId: imageId, // Guarda el ID de la imagen de la piedra
                piedraImageDeleteToken: piedraImageDeleteToken,
                createdAt: new Date() // Opcional: marca de tiempo de creación
            });

            console.log("Piedra añadida con ID: ", docRef.id);
            showMessage2('Piedra añadida con éxito!', 'success');
            piedrasForm.reset(); // Limpia el formulario después de la inserción
            renderPiedrasTable(); // Recargar la tabla de piedras
        } catch (error) {
            console.error("Error al añadir la piedra:", error);
            showMessage2('Error al añadir la piedra. Revisa la consola.', 'error');
        }
    });

    function showMessage2(msg, type) {
        message2Container.textContent = msg;
        message2Container.classList.add(type);
        message2Container.style.display = 'block';
    }

    async function renderPiedrasTable() {
        const piedrasTableBody = document.querySelector("#piedras-table tbody");
        piedrasTableBody.innerHTML = ''; // Limpiar tabla

        try{
            // === CAMBIO AQUÍ ===
            // 1. Crear una consulta con la función `query`
            // 2. Usar `orderBy` para ordenar por el campo 'nombre' de forma ascendente
            const piedrasQuery = query(collection(db, "piedras"), orderBy("nombre", "asc"));

            // ejecutar la consulta
            const querySnapshot = await getDocs(piedrasQuery);

            querySnapshot.forEach((documento) => {
            const piedra = documento.data();
            const piedraId = documento.id; // Obtener el ID del documento
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
            console.error("Error al obtener piedras desde Firestore:", error);
            // Manejo de errores adicional si es necesario
        }       

        document.querySelectorAll('.btn-eliminar-piedra').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;

                if (confirm('¿Estás seguro de que deseas eliminar esta piedra?')) {

                    try {
                        // 1. Obtener el documento de firestore para obtener el hash de eliminación
                        const docRef = doc(db, "piedras", id);
                        const docSnap = await getDoc(docRef);

                        if (docSnap.exists()) {
                            const piedraData = docSnap.data();
                            const imageId = piedraData.imageId; // Obtener el ID
                            const imageDeleteToken = piedraData.piedraImageDeleteToken; // Obtener el Token

                            if (imageId && imageDeleteToken) {
                                // 2. eliminar la imagen de ImgBB
                                try {
                                    // CONSTRUCCIÓN CORRECTA DE LA URL DE ELIMINACIÓN SEGÚN LA NUEVA DOC
                                    const deleteImgbbResponse = await fetch(`https://api.imgbb.com/1/delete/${imageId}/${imageDeleteToken}?key=${IMGBB_API_KEY}`, {
                                        method: 'GET' // ¡CAMBIO CRUCIAL: AHORA ES GET!
                                    });
                                    const deleteImgbbData = await deleteImgbbResponse.json();

                                    if (deleteImgbbResponse.ok && deleteImgbbData.success) {
                                        console.log("Imagen eliminada de ImgBB exitosamente.");
                                    } else {
                                        console.warn("Error al eliminar la imagen de ImgBB:", deleteImgbbData);
                                    }
                                } catch (imgbbError) {
                                    console.log("Error de red al intentar eliminar la imagen de ImgBB:", imgbbError);
                                }
                            } else {
                                console.warn("No se encontró la URL de eliminación de la imagen para eliminarla de ImgBB.");
                            }
                        } else {
                            console.warn("Documento no encontreado en Firestore para eliminar la imagen asociada.");
                        }

                        // 3. Eliminar el documento de Firestore
                        await deleteDoc(doc(db, "piedras", id));
                        showMessagePiedras('Producto y su imagen (si existía) eliminados con éxito.', 'success');
                        renderPiedrasTable(); // Volver a cargar tabla

                    } catch (firestoreError) {
                        console.error("Error al eliminar el producto de firestore:", firestoreError);
                        showMessagePiedras('Error al eliminar el producto. Revisa la consola.', 'error');
                        return;
                    }

                }
            });
        });

        // =======================================================
        // Agregar evento a cada botón de actualizar piedra
        // =======================================================
        document.querySelectorAll('.btn-actualizar-piedra').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;

                // Obtener los valores de los inputs
                const nuevoNombre = document.getElementById(`nombre-input-${id}`).value;
                const nuevaInfo = document.getElementById(`info-input-${id}`).value;

                // Validar los datos
                if (!nuevoNombre.trim() || !nuevaInfo.trim()) {
                    showMessagePiedras('Por favor, completa todos los campos.', 'error');
                    return;
                }

                try {
                    // Referencia al documento en Firestore
                    const docRef = doc(db, "piedras", id);

                    // Objeto con los datos a actualizar
                    const updatedData = {
                        nombre: nuevoNombre,
                        info: nuevaInfo
                    };

                    // Usar updateDoc para actualizar los campos
                    await updateDoc(docRef, updatedData);

                    showMessagePiedras('Piedra actualizada con éxito.', 'success');
                    // Opcional: Volver a cargar la tabla para reflejar los cambios
                    // renderPiedrasTable();
                } catch (error) {
                    console.error("Error al actualizar la piedra:", error);
                    showMessagePiedras('Error al actualizar la piedra. Revisa la consola.', 'error');
                }
            });
        });
    }


    renderProductosTable();
    renderPiedrasTable(); // Cargar la tabla de piedras
    // Inicializar el formulario y la tabla de productos
});