// src/insert/script.js

// Importa db desde la carpeta superior
import { db } from '../db.js';

// Importa las funciones necesarias de Firestore
import { collection, addDoc, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

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
const IMGBB_DELETE_URL = `https://api.imgbb.com/1/delete?key=${IMGBB_API_KEY}`;
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
            const imageDeleteHash = imgbbData.data.deletehash || null;
            console.log('Imagen subida a ImgBB, URL:', imageUrl);

            // Añade el documento a la colección "productos" en Firestore
            const docRef = await addDoc(collection(db, "productos"), {
                name: productName,
                description: productDescription,
                price: productPrice,
                image: imageUrl, // Usa la URL de la imagen subida
                imageDeleteHash: imageDeleteHash, // Guarda el hash de eliminación de la imagen
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


    async function renderProductosTable() {
        const tableBody = document.querySelector("#productos-table tbody");
        tableBody.innerHTML = ''; // Limpiar tabla

        const querySnapshot = await getDocs(collection(db, "productos"));
        querySnapshot.forEach((documento) => {
            const producto = documento.data();
            const productoId = documento.id; // Obtener el ID del documento
            const row = document.createElement("tr");

            row.innerHTML = `
            <td>${producto.name}</td>
            <td>${producto.description}</td>
            <td>$${parseFloat(producto.price).toFixed(2)}</td>
            <td>${producto.category}</td>
            <td>${producto.material || 'No disponible'}</td>
            <td><img src="${producto.image}" alt="${producto.name}" style="width: 50px; height: auto;"></td>            
            <td><button class="btn-eliminar" data-id="${productoId}">Eliminar</button></td>
        `;

            tableBody.appendChild(row);
        });

        // Agregar evento a cada botón de eliminar
        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;

                if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {

                    try{
                        // 1. Obtener el documento de firestore para obtener el hash de eliminación
                        const docRef = doc(db, "productos", id);
                        const docSnap = await getDoc(docRef);

                        if (docSnap.exists()) {
                            const productoData = docSnap.data();
                            const imageDeleteHash = productoData.imageDeleteHash; // Obtener el delete hash de la imagen

                            if (imageDeleteHash) {
                                // 2. eliminar la iamgen de ImgBB
                                try {
                                    const deleteImgbbResponse = await fetch(`${IMGBB_DELETE_URL}&deletehash=${imageDeleteHash}`, {
                                        method: 'POST' // ImgBB usa POST para la eliminar por deletehash

                                    });
                                    const deleteImgbbData = await deleteImgbbResponse.json();

                                    if (deleteImgbbResponse.ok && deleteImgbbData.success) {
                                        console.log("Imagen eliminada de imgbb exitosamente");                                        
                                    } else {
                                        console.warn("Error al eleminar la imagen de ImgBB:", deleteImgbbData);
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
                        showMessage('Producto y su imagen (si existía) eliminados con éxito.', 'success');
                        renderProductosTable(); // Volver a cargar tabla

                    } catch (firestoreError) {
                        console.error("Error al eliminar el producto de firestore:", firestoreError);
                        showMessage('Error al eliminar el producto. Revisa la consola.', 'error');
                        return;
                    }

                }
            });
        });
    }


    renderProductosTable();
    // Inicializar el formulario y la tabla de productos
});