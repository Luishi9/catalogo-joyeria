import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { db } from './db.js'; // Asegúrate de que la ruta sea correcta

document.addEventListener('DOMContentLoaded', function () {
    const productGrid = document.getElementById('product-grid');
    const categoryButtons = document.querySelectorAll('.category-btn');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mainNav = document.querySelector('.main-nav');
    const navLinks = document.querySelectorAll('.main-nav a');

    const materialsFilterContainer = document.getElementById('materials-filter-container');

    // Estado actual de los filtros
    let currentCategoryFilter = 'all';
    let currentMaterialFilter = 'all';


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
            // Desactivar todos los botones de categoría y activar el actual
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // CORRECTO: Actualiza la variable de estado global `currentCategoryFilter`
            currentCategoryFilter = button.dataset.category; 
            
            // CORRECTO: Llama a renderProducts SIN parámetros, ya que usa las variables de estado globales
            renderProducts(); 
        });
    });

    // =========================================================================
    // === NUEVA FUNCIÓN: Carga y muestra los botones de filtro de materiales ===
    // =========================================================================
    async function loadMaterialFilters() {
        // Limpiar el contenedor actual de filtros
        materialsFilterContainer.innerHTML = '';

        const uniqueMaterials = new Set();
        try {
            const querySnapshot = await getDocs(collection(db, "productos"));
            querySnapshot.forEach((doc) => {
                const producto = doc.data();
                const materialString = producto.material;

                if (materialString) {
                    // Divide por comas o espacios, y filtra cadenas vacías
                    materialString.split(/[,\s]+/).filter(Boolean).forEach(part => {
                        const trimmedMaterial = part.trim().toLowerCase();
                        if (trimmedMaterial) {
                            uniqueMaterials.add(trimmedMaterial);
                        }
                    });
                }
            });
        } catch (error) {
            console.error("Error al obtener materiales para los filtros:", error);
            // Puedes mostrar un mensaje de error en el UI si es necesario
        }

        const sortedMaterials = Array.from(uniqueMaterials).sort();

        // Botón "Todos los Materiales"
        const allMaterialsButton = document.createElement('button');
        allMaterialsButton.textContent = 'Todos';
        allMaterialsButton.classList.add('material-filter-btn');
        allMaterialsButton.classList.add('category-btn'); // Clase para estilos
        // ACTIVO por defecto si el filtro actual de material es 'all'
        if (currentMaterialFilter === 'all') {
            allMaterialsButton.classList.add('active'); 
        }
        allMaterialsButton.dataset.material = 'all';
        materialsFilterContainer.appendChild(allMaterialsButton);

        allMaterialsButton.addEventListener('click', () => {
            // Desactivar todos los botones de material y activar este
            document.querySelectorAll('.material-filter-btn').forEach(btn => btn.classList.remove('active'));
            allMaterialsButton.classList.add('active');
            currentMaterialFilter = 'all'; // Restablece el filtro de material
            renderProducts(); // Renderiza con los filtros actuales
        });


        sortedMaterials.forEach(material => {
            const button = document.createElement('button');
            // Capitalizar la primera letra para la visualización
            button.textContent = material.charAt(0).toUpperCase() + material.slice(1);
            button.classList.add('material-filter-btn');
            button.classList.add('category-btn'); // Clase para estilos
            // Activar el botón si coincide con el filtro de material actual
            if (currentMaterialFilter === material) {
                button.classList.add('active');
            }
            button.dataset.material = material;

            button.addEventListener('click', () => {
                // Desactivar todos los botones de material y activar este
                document.querySelectorAll('.material-filter-btn').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                currentMaterialFilter = material; // Actualiza el filtro de material
                renderProducts(); // Renderiza con los filtros actuales
            });
            materialsFilterContainer.appendChild(button);
        });
    }


    // Renderizar productos desde Firestore
    // Ya no acepta parámetros, usa las variables de estado globales
    async function renderProducts() { 
        productGrid.innerHTML = '';

        try {
            const querySnapshot = await getDocs(collection(db, "productos"));
            let products = [];

            querySnapshot.forEach((doc) => {
                products.push({ id: doc.id, ...doc.data() });
            });

            // Aplicar filtro de categoría
            // Usa currentCategoryFilter, que ya está actualizado por los botones de categoría
            let filteredProducts = currentCategoryFilter === 'all'
                ? products
                : products.filter(product => product.category === currentCategoryFilter);

            // Aplicar filtro de material (si no es 'all')
            // Usa currentMaterialFilter, que ya está actualizado por los botones de material
            if (currentMaterialFilter !== 'all') {
                filteredProducts = filteredProducts.filter(product => {
                    // Asegúrate de que product.material exista antes de intentar .toLowerCase() o .split()
                    const productMaterialString = product.material ? String(product.material).toLowerCase() : ''; 
                    // Divide por coma o espacio, y filtra vacíos
                    const materialsInProduct = productMaterialString.split(/[,\s]+/).filter(Boolean);
                    
                    // Verifica si ALGUNO de los materiales del producto coincide con el filtro
                    return materialsInProduct.includes(currentMaterialFilter.toLowerCase());
                });
            }

            if (filteredProducts.length === 0) {
                productGrid.innerHTML = '<p class="no-products-message">No se encontraron productos que coincidan con los filtros.</p>';
            } else {
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
                            <p class="product-material">Material: ${product.material || 'No especificado'}</p>
                            <div class="product-price">$${parseFloat(product.price).toFixed(2)}</div>
                            <div class="product-actions"></div>
                        </div>
                    `;
                    productGrid.appendChild(productCard);
                });
            }


        } catch (error) {
            console.error("Error al obtener productos desde Firestore:", error);
            productGrid.innerHTML = '<p class="error">No se pudieron cargar los productos.</p>';
        }
    }

    // Inicializar: cargar filtros de material y renderizar productos
    loadMaterialFilters();
    renderProducts(); // Llama a renderProducts sin argumentos, usará los filtros globales 'all'
});