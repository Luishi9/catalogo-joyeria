import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { db } from './db.js'; // Asegúrate de que la ruta sea correcta

document.addEventListener('DOMContentLoaded', function () {
    const productGrid = document.getElementById('product-grid');
    const categoryButtons = document.querySelectorAll('.category-btn');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mainNav = document.querySelector('.main-nav');
    const navLinks = document.querySelectorAll('.main-nav a');

    const materialSelectFilter = document.getElementById('material-select-filter');

    const piedrasGrid = document.getElementById('piedras-grid');

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
        materialSelectFilter.innerHTML = '';

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
    // === NUEVO EVENT LISTENER para el SELECT de materiales ===
    // =========================================================================
    materialSelectFilter.addEventListener('change', () => {
        currentMaterialFilter = materialSelectFilter.value; // Actualiza el filtro de material con el valor seleccionado
        renderProducts(); // Renderiza los productos con el nuevo filtro
    });


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

    
    // Renderizar piedras e informacion desde FireStore

    // Asegúrate de que 'piedrasGrid' y 'showMoreBtn' estén definidos
    const showMoreBtn = document.getElementById('show-more-piedras-btn');

    async function renderPiedras() {
        piedrasGrid.innerHTML = '';
        showMoreBtn.style.display = 'none'; // Ocultar el botón al inicio

        try {

            // == Ordenar por Nombre ==
            const piedrasCollection = query(collection(db, "piedras"), orderBy("nombre", "asc"));

            const querySnapshot = await getDocs(piedrasCollection);
            
            let piedras = [];
            querySnapshot.forEach((doc) => {
                piedras.push({ id: doc.id, ...doc.data() });
            });

            if (piedras.length === 0) {
                piedrasGrid.innerHTML = '<p>No hay piedras para mostrar.</p>';
                return;
            }


            piedras.forEach(piedra => {
                const piedraCard = document.createElement('div');
                piedraCard.className = `card piedra-card ${index >= 3 ? 'hidden-card' : ''}`;

                piedraCard.innerHTML = `
                        <div class="row g-0">
                            <div class="col-md-2 text-center">
                                <img src="${piedra.image}" class="img-fluid rounded-start" alt="${piedra.name}">
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

                // Agrega el evento para mostrar todas las tarjetas al hacer clic
                showMoreBtn.onclick = () => {
                    document.querySelectorAll('.hidden-card').forEach(card => {
                        card.classList.remove('hidden-card');
                    });
                    showMoreBtn.style.display = 'none'; // Oculta el botón después de usarse
                };
            }
        } catch (error) {
            console.error("Error al obtener piedras desde Firestore:", error);
            piedrasGrid.innerHTML = '<p class="error">No se pudieron cargar las piedras.</p>';
        }
    }

    // Inicializar: cargar filtros de material y renderizar productos
    loadMaterialFilters();
    renderProducts(); // Llama a renderProducts sin argumentos, usará los filtros globales 'all'
    renderPiedras(); // Llama a renderPiedras para cargar las piedras
});