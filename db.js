// Base de datos de productos de joyería
/*
const products = [
    {
        id: 1,
        name: "Anillo de Oro Rosa",
        description: "Anillo de oro rosa 18k con diseño minimalista y acabado pulido.",
        price: 299.99,
        category: "anillos",
        image: "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?ixlib=rb-1.2.1&auto=format&fit=crop&w=634&q=80"
    },
    {
        id: 2,
        name: "Collar de Diamantes",
        description: "Elegante collar con cadena de plata esterlina y diamantes genuinos.",
        price: 899.99,
        category: "collares",
        image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?ixlib=rb-1.2.1&auto=format&fit=crop&w=634&q=80"
    },
    {
        id: 3,
        name: "Pulsera de Plata",
        description: "Pulsera tejida a mano en plata 925 con cierre seguro.",
        price: 149.50,
        category: "pulseras",
        image: "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?ixlib=rb-1.2.1&auto=format&fit=crop&w=634&q=80"
    },
    {
        id: 4,
        name: "Pendientes de Perlas",
        description: "Pendientes clásicos con perlas cultivadas y montura de oro amarillo.",
        price: 199.99,
        category: "pendientes",
        image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?ixlib=rb-1.2.1&auto=format&fit=crop&w=634&q=80"
    },
    {
        id: 5,
        name: "Anillo de Compromiso",
        description: "Anillo de platino con diamante central de 0.5 quilates.",
        price: 2499.99,
        category: "anillos",
        image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?ixlib=rb-1.2.1&auto=format&fit=crop&w=634&q=80"
    },
]
*/


// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";

import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBWnHAjESYjfe0evxdipMYHuj8DZziH7GE",
    authDomain: "catalogo-5e529.firebaseapp.com",
    projectId: "catalogo-5e529",
    storageBucket: "catalogo-5e529.firebasestorage.app",
    messagingSenderId: "485951596781",
    appId: "1:485951596781:web:43ecaba21313efc78284e4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

// Obtener productos
const querySnapshot = await getDocs(collection(db, "productos"));
querySnapshot.forEach((doc) => {
    const data = doc.data();
    console.log("Producto:", data);
});