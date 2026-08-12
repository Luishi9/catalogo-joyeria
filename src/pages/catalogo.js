// src/pages/catalogo.js
// Catalogo publico: lee productos y piedras desde Supabase (Postgres).
import { supabase } from '../lib/supabase.js';

document.addEventListener('DOMContentLoaded', function () {
    const productGrid = document.getElementById('product-grid');
    const categoryButtons = document.querySelectorAll('.category-btn');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mainNav = document.querySelector('.main-nav');
    const navLinks = document.querySelectorAll('.main-nav a');

    const materialSelectFilter = document.getElementById('material-select-filter');

    const piedrasGrid = document.getElementById('piedras-grid');

    const showMoreProductsBtn = document.getElementById('show-more-products-btn');
    const showMoreProductsContainer = document.getElementById('show-more-products-container');
    const INITIAL_VISIBLE_PRODUCTS = 6;

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

            // Actualiza la variable de estado global `currentCategoryFilter`
            currentCategoryFilter = button.dataset.category;

            // Llama a renderProducts SIN parámetros, ya que usa las variables de estado globales
            renderProducts();
        });
    });

    // =========================================================================
    // === Carga y muestra los botones de filtro de materiales ===
    // =========================================================================
    async function loadMaterialFilters() {
        // Limpiar el contenedor actual de filtros
        materialSelectFilter.innerHTML = '';

        const uniqueMaterials = new Set();
        try {
            const { data: productos, error } = await supabase
                .from('productos')
                .select('material');

            if (error) throw error;

            (productos || []).forEach((producto) => {
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
        }

        const sortedMaterials = Array.from(uniqueMaterials).sort();

        // Primera opción: "Todos los Materiales"
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'Todos los Materiales';
        materialSelectFilter.appendChild(allOption);

        // Añadir opciones para cada material único
        sortedMaterials.forEach(material => {
            const option = document.createElement('option');
            option.value = material;
            option.textContent = material.charAt(0).toUpperCase() + material.slice(1); // Capitalizar
            materialSelectFilter.appendChild(option);
        });

        // Asegurarse de que el select muestre la opción actualmente seleccionada
        materialSelectFilter.value = currentMaterialFilter;
    }

    // =========================================================================
    // === EVENT LISTENER para el SELECT de materiales ===
    // =========================================================================
    materialSelectFilter.addEventListener('change', () => {
        currentMaterialFilter = materialSelectFilter.value;
        renderProducts();
    });

    // =========================================================================
    // === EVENT LISTENER para el botón "Mostrar más" de productos ===
    // =========================================================================
    showMoreProductsBtn.addEventListener('click', () => {
        const hiddenCards = document.querySelectorAll('.hidden-product-card');
        hiddenCards.forEach(card => {
            card.classList.remove('hidden-product-card');
        });
        showMoreProductsContainer.style.display = 'none';
    });


    // Renderizar productos desde Supabase
    async function renderProducts() {
        productGrid.innerHTML = '';

        try {
            const { data: rows, error } = await supabase
                .from('productos')
                .select('*');

            if (error) throw error;

            let products = (rows || []).map(row => ({ id: row.id, ...row }));

            // Aplicar filtro de categoría
            let filteredProducts = currentCategoryFilter === 'all'
                ? products
                : products.filter(product => product.category === currentCategoryFilter);

            // Aplicar filtro de material (si no es 'all')
            if (currentMaterialFilter !== 'all') {
                filteredProducts = filteredProducts.filter(product => {
                    const productMaterialString = product.material ? String(product.material).toLowerCase() : '';
                    const materialsInProduct = productMaterialString.split(/[,\s]+/).filter(Boolean);
                    return materialsInProduct.includes(currentMaterialFilter.toLowerCase());
                });
            }

            if (filteredProducts.length === 0) {
                productGrid.innerHTML = '<p class="no-products-message">No se encontraron productos que coincidan con los filtros.</p>';
                showMoreProductsContainer.style.display = 'none';
            } else {
                filteredProducts.forEach((product, index) => {
                    const productCard = document.createElement('div');
                    productCard.className = 'card text-center product-card';
                    // Ocultar cards después de las primeras 6
                    if (index >= INITIAL_VISIBLE_PRODUCTS) {
                        productCard.classList.add('hidden-product-card');
                    }
                    productCard.innerHTML = `
                        <div class="card-header product-img skeleton-loader">
                            <img src="${product.image}" alt="${product.name}" loading="lazy" decoding="async" onload="this.classList.add('loaded'); this.parentElement.classList.remove('skeleton-loader');">
                        </div>
                        <div class="card-body product-info">
                            <span class="product-category ${product.category}">${product.category}</span>
                            <h3 class="product-title">${product.name}</h3>
                            <p class="product-desc">${product.description}</p>
                        </div>
                        <div class="card-footer text-body-secondary">
                            <p class="product-material">Material: ${product.material || 'No especificado'}</p>
                        </div>
                    </div>
                    `;
                    productGrid.appendChild(productCard);
                });

                // Mostrar u ocultar el botón "Mostrar más"
                if (filteredProducts.length > INITIAL_VISIBLE_PRODUCTS) {
                    showMoreProductsContainer.style.display = 'block';
                    showMoreProductsBtn.textContent = 'Mostrar más';
                } else {
                    showMoreProductsContainer.style.display = 'none';
                }
            }

        } catch (error) {
            console.error("Error al obtener productos desde Supabase:", error);
            productGrid.innerHTML = '<p class="error">No se pudieron cargar los productos.</p>';
        }
    }


    // Renderizar piedras e información desde Supabase
    const showMoreBtn = document.getElementById('show-more-piedras-btn');
    async function renderPiedras() {
        piedrasGrid.innerHTML = '';
        showMoreBtn.style.display = 'none';

        try {
            // Ordenar por nombre ascendente
            const { data: rows, error } = await supabase
                .from('piedras')
                .select('*')
                .order('nombre', { ascending: true });

            if (error) throw error;

            let piedras = (rows || []).map(row => ({ id: row.id, ...row }));

            if (piedras.length === 0) {
                piedrasGrid.innerHTML = '<p>No hay piedras para mostrar.</p>';
                return;
            }

            piedras.forEach((piedra, index) => {
                const piedraCard = document.createElement('div');
                piedraCard.className = `card mb-3 piedra-card ${index >= 3 ? 'hidden-card' : ''}`;

                piedraCard.innerHTML = `
                        <div class="row g-0">
                            <div class="col-md-2 text-center">
                                <img src="${piedra.image}" class="img-fluid rounded-start" alt="${piedra.nombre}" loading="lazy" decoding="async">
                            </div>
                            <div class="col-md-10">
                                <div class="card-body">
                                    <h5 class="card-title">${piedra.nombre}</h5>
                                    <p class="card-text">${piedra.info || 'No description available.'}</p>
                                </div>
                            </div>
                        </div>
                `;
                piedrasGrid.appendChild(piedraCard);
            });

            // Si hay más de 3 piedras, muestra el botón y configura el evento
            if (piedras.length > 3) {
                showMoreBtn.style.display = 'block';

                showMoreBtn.onclick = () => {
                    document.querySelectorAll('.hidden-card').forEach(card => {
                        card.classList.remove('hidden-card');
                    });
                    showMoreBtn.style.display = 'none';
                };
            }
        } catch (error) {
            console.error("Error al obtener piedras desde Supabase:", error);
            piedrasGrid.innerHTML = '<p class="error">No se pudieron cargar las piedras.</p>';
        }
    }

    // Inicializar: cargar filtros de material, productos y piedras
    loadMaterialFilters();
    renderProducts();
    renderPiedras();
});