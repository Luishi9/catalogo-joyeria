// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";

import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

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

export { db };