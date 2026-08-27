// src/pages/catalogo.js
// Catalogo publico: lee productos y piedras desde Supabase (Postgres).
// Optimizacion: carga 1 sola vez los productos y los filtra en memoria.
import { supabase } from '../lib/supabase.js';

// importar keepalive.js para mantener la base de datos activa


document.addEventListener('DOMContentLoaded', function () {
    const productGrid = document.getElementById('product-grid');
    const categoryButtons = document.querySelectorAll('.category-btn');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mainNav = document.querySelector('.main-nav');
    const navLinks = document.querySelectorAll('.main-nav a');

    const materialSelectFilter = document.getElementById('material-select-filter');

    // Estado de busqueda por piedras (solo en la seccion de piedras, no global)
    const piedrasGrid = document.getElementById('piedras-grid');
    const piedrasSearchInput = document.getElementById('piedras-search');
    const piedrasSearchForm = piedrasSearchInput?.closest('form');
    let currentPiedrasSearchTerm = '';

    // Estado de busqueda global (para productos y piedras)
    const globalSearchInput = document.getElementById('global-search-input');
    const globalSearchForm = document.getElementById('global-search-form');
    let currentGlobalSearchTerm = '';

    const showMoreProductsBtn = document.getElementById('show-more-products-btn');
    const showMoreProductsContainer = document.getElementById('show-more-products-container');
    const INITIAL_VISIBLE_PRODUCTS = 6;

    // Estado actual de los filtros
    let currentCategoryFilter = 'all';
    let currentMaterialFilter = 'all';

    // Cache en memoria: se carga 1 sola vez, los filtros no vuelven a consultar.
    let allProducts = [];
    let allPiedras = [];
    let productosCargados = false;

    // Menú móvil
    mobileMenuBtn?.addEventListener('click', () => {
        mainNav.classList.toggle('active');
        if (mainNav.classList.contains('active')) {
            mobileMenuBtn.innerHTML = '<i class="fas fa-times"></i>';
        } else {
            mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
        }
    });

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 992) {
                mainNav.classList.remove('active');
                mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
            }
        });
    });

    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentCategoryFilter = button.dataset.category;
            renderProducts(); // filtra en memoria, 0 consultas
        });
    });

    // =========================================================================
    // === Carga UNICA de datos ===
    // =========================================================================

    // Una sola consulta a la BD de productos; despues todo se filtra en memoria.
    async function cargarDatos() {
        try {
            const { data, error } = await supabase
                .from('productos')
                .select('id, name, description, image, category, material, created_at');

            if (error) throw error;

            // Ordenar por fecha de creacion descendente (mas nuevos primero).
            allProducts = (data || [])
                .map(row => ({ id: row.id, ...row }))
                .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
            productosCargados = true;

            // A partir del dataset ya cargado, construir el filtro de materiales.
            construirFiltroMateriales();
            renderProducts();
        } catch (error) {
            console.error("Error al cargar productos:", error);
            productGrid.innerHTML = '<p class="error">No se pudieron cargar los productos.</p>';
        }

        // Piedras en paralelo ( independiente de productos ).
        try {
            const { data: piedrasData, error: perror } = await supabase
                .from('piedras')
                .select('id, nombre, info, image, created_at')
                .order('nombre', { ascending: true });

            if (perror) throw perror;

            allPiedras = (piedrasData || []).map(row => ({ id: row.id, ...row }));
            renderPiedras();
        } catch (error) {
            console.error("Error al cargar piedras:", error);
            piedrasGrid.innerHTML = '<p class="error">No se pudieron cargar las piedras.</p>';
        }
    }

    // =========================================================================
    // === Filtro de materiales (de los productos ya cargados en memoria) ===
    // =========================================================================

    function construirFiltroMateriales() {
        const uniqueMaterials = new Set();
        allProducts.forEach((producto) => {
            const materialString = producto.material;
            if (materialString) {
                materialString.split(/[,\s]+/).filter(Boolean).forEach(part => {
                    const trimmedMaterial = part.trim().toLowerCase();
                    if (trimmedMaterial) uniqueMaterials.add(trimmedMaterial);
                });
            }
        });

        const sortedMaterials = Array.from(uniqueMaterials).sort();

        materialSelectFilter.innerHTML = '';

        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'Todos los Materiales';
        materialSelectFilter.appendChild(allOption);

        sortedMaterials.forEach(material => {
            const option = document.createElement('option');
            option.value = material;
            option.textContent = material.charAt(0).toUpperCase() + material.slice(1);
            materialSelectFilter.appendChild(option);
        });

        materialSelectFilter.value = currentMaterialFilter;
    }

    materialSelectFilter.addEventListener('change', () => {
        currentMaterialFilter = materialSelectFilter.value;
        renderProducts();
    });

    showMoreProductsBtn.addEventListener('click', () => {
        const hiddenCards = document.querySelectorAll('.hidden-product-card');
        hiddenCards.forEach(card => card.classList.remove('hidden-product-card'));
        showMoreProductsContainer.style.display = 'none';
    });

    // =========================================================================
    // === Render de productos (filtra en memoria) ===
    // =========================================================================

    function renderProducts() {
        productGrid.innerHTML = '';

        if (!productosCargados) {
            productGrid.innerHTML = '<p class="no-products-message">Cargando productos...</p>';
            showMoreProductsContainer.style.display = 'none';
            return;
        }

        let filteredProducts = currentCategoryFilter === 'all'
            ? allProducts
            : allProducts.filter(product => product.category === currentCategoryFilter);

        if (currentMaterialFilter !== 'all') {
            filteredProducts = filteredProducts.filter(product => {
                const productMaterialString = product.material ? String(product.material).toLowerCase() : '';
                const materialsInProduct = productMaterialString.split(/[,\s]+/).filter(Boolean);
                return materialsInProduct.includes(currentMaterialFilter.toLowerCase());
            });
        }

        if (currentGlobalSearchTerm.trim() !== '') {
            const q = currentGlobalSearchTerm.trim().toLowerCase();
            filteredProducts = filteredProducts.filter(product =>
                (product.material || '').toLowerCase().includes(q)
            );
        }

        if (filteredProducts.length === 0) {
            productGrid.innerHTML = '<p class="no-products-message">No se encontraron productos que coincidan con los filtros.</p>';
            showMoreProductsContainer.style.display = 'none';
            return;
        }

        // Dimensiones fijas para evitar CLS; las primeras 6 cargan con prioridad.
        filteredProducts.forEach((product, index) => {
            const productCard = document.createElement('div');
            productCard.className = 'card text-center product-card';
            if (index >= INITIAL_VISIBLE_PRODUCTS) {
                productCard.classList.add('hidden-product-card');
            }
            const prioridad = index < INITIAL_VISIBLE_PRODUCTS ? 'high' : 'low';
            const esLazy = index < INITIAL_VISIBLE_PRODUCTS ? '' : 'loading="lazy"';
            productCard.innerHTML = `
                <div class="card-header product-img skeleton-loader">
                    <img src="${product.image}" alt="${product.name}" width="600" height="600"
                         ${esLazy} decoding="async" fetchpriority="${prioridad}"
                         onload="this.classList.add('loaded'); this.parentElement.classList.remove('skeleton-loader');">
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

        if (filteredProducts.length > INITIAL_VISIBLE_PRODUCTS) {
            showMoreProductsContainer.style.display = 'block';
            showMoreProductsBtn.textContent = 'Mostrar más';
        } else {
            showMoreProductsContainer.style.display = 'none';
        }
    }

    // =========================================================================
    // === Render de piedras ===
    // =========================================================================

    const showMoreBtn = document.getElementById('show-more-piedras-btn');

    function filtarPiedras(query) {
        if (!query) return allPiedras;
        const q = query.trim().toLowerCase();
        return allPiedras.filter(p =>
            (p.nombre || '').toLowerCase().includes(q) ||
            (p.info || '').toLowerCase().includes(q)
        );
    }

    function renderPiedras() {
        piedrasGrid.innerHTML = '';
        showMoreBtn.style.display = 'none';

        const terminoActivo = (currentPiedrasSearchTerm || currentGlobalSearchTerm).trim();

        const piedras = filtarPiedras(terminoActivo);
        if (piedras.length === 0) {
            piedrasGrid.innerHTML = terminoActivo
                ? '<p>No se encontraron piedras que coincidan con la búsqueda.</p>'
                : '<p>No hay piedras para mostrar.</p>';
            return;
        }

        const buscando = terminoActivo !== '';

        piedras.forEach((piedra, index) => {
            const piedraCard = document.createElement('div');
            piedraCard.className = `card mb-3 piedra-card ${!buscando && index >= 3 ? 'hidden-card' : ''}`;

            piedraCard.innerHTML = `
                    <div class="row g-0">
                        <div class="col-md-2 text-center">
                            <img src="${piedra.image}" class="img-fluid rounded-start" alt="${piedra.nombre}"
                                 width="300" height="300" loading="lazy" decoding="async">
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

        if (!buscando && piedras.length > 3) {
            showMoreBtn.style.display = 'block';
            showMoreBtn.onclick = () => {
                document.querySelectorAll('.hidden-card').forEach(card => card.classList.remove('hidden-card'));
                showMoreBtn.style.display = 'none';
            };
        }
    }

    globalSearchInput?.addEventListener('input', () => {
        currentGlobalSearchTerm = globalSearchInput.value;
        renderProducts();
        renderPiedras();
    });

    globalSearchForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        currentGlobalSearchTerm = globalSearchInput.value;
        renderProducts();
        renderPiedras();
    });

    piedrasSearchInput?.addEventListener('input', () => {
        currentPiedrasSearchTerm = piedrasSearchInput.value;
        renderPiedras();
    });

    piedrasSearchForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        currentPiedrasSearchTerm = piedrasSearchInput.value;
        renderPiedras();
    });

    // =========================================================================
    // === Inicializacion: un solo fetch ===
    // =========================================================================
    cargarDatos();
});

import '../keepalive.js'; // O la ruta donde lo guardes