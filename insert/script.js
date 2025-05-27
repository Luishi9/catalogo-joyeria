// src/insert/script.js

// Importa db desde la carpeta superior
import { db } from '../db.js';

// Importa las funciones necesarias de Firestore
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const productForm = document.getElementById('productForm');
    const messageContainer = document.getElementById('messageContainer');

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
        const productImage = document.getElementById('productImage').value;
        const productCategory = document.getElementById('productCategory').value;

        // Validaciones básicas (puedes añadir más)
        if (!productName || !productDescription || isNaN(productPrice) || !productImage || !productCategory) {
            showMessage('Por favor, completa todos los campos.', 'error');
            return;
        }

        try {
            // Añade el documento a la colección "productos" en Firestore
            const docRef = await addDoc(collection(db, "productos"), {
                name: productName,
                description: productDescription,
                price: productPrice,
                image: productImage,
                category: productCategory,
                createdAt: new Date() // Opcional: marca de tiempo de creación
            });

            console.log("Producto añadido con ID: ", docRef.id);
            showMessage('Producto añadido con éxito!', 'success');
            productForm.reset(); // Limpia el formulario después de la inserción

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
});