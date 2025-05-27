import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { db } from './db.js'; // Asegúrate de que la ruta sea correcta

document.addEventListener('DOMContentLoaded', function() {
    const productGrid = document.getElementById('product-grid');
    const categoryButtons = document.querySelectorAll('.category-btn');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mainNav = document.querySelector('.main-nav');
    const navLinks = document.querySelectorAll('.main-nav a'); 

    // Menú móvil
    mobileMenuBtn.addEventListener('click', () => {
        mainNav.classList.toggle('active');

        // Cambiar ícono de hamburguesa a X cuando está activo
        if (mainNav.classList.contains('active')) {
            mobileMenuBtn.innerHTML = '<i class="fas fa-times"></i>';
        } else {
            mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
        }
    });

    // Cerrar menú al hacer clic en un enlace (solo en móvil)
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 992) {
                mainNav.classList.remove('active');
                mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
            }
        });
    });

    // Filtrar productos por categoría
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const category = button.dataset.category;
            renderProducts(category);
        });
    });

    // Renderizar productos desde Firestore
    async function renderProducts(category = 'all') {
        productGrid.innerHTML = '';

        try {
            const querySnapshot = await getDocs(collection(db, "productos"));
            let products = [];

            querySnapshot.forEach((doc) => {
                products.push({ id: doc.id, ...doc.data() });
            });

            const filteredProducts = category === 'all'
                ? products
                : products.filter(product => product.category === category);

            filteredProducts.forEach(product => {
                const productCard = document.createElement('div');
                productCard.className = 'product-card';
                productCard.innerHTML = `
                    <div class="product-img">
                        <img src="${product.image}" alt="${product.name}">
                    </div>
                    <div class="product-info">
                        <span class="product-category ${product.category}">${product.category}</span>
                        <h3 class="product-title">${product.name}</h3>
                        <p class="product-desc">${product.description}</p>
                        <div class="product-price">$${parseFloat(product.price).toFixed(2)}</div>
                        <div class="product-actions"></div>
                    </div>
                `;
                productGrid.appendChild(productCard);
            });

        } catch (error) {
            console.error("Error al obtener productos desde Firestore:", error);
            productGrid.innerHTML = '<p class="error">No se pudieron cargar los productos.</p>';
        }
    }

    // Inicializar
    renderProducts();
});
