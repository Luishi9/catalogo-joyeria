document.addEventListener('DOMContentLoaded', function() {
    // Variables
    const cartIcon = document.querySelector('.cart-icon');
    const cartModal = document.getElementById('cart-modal');
    const closeCart = document.querySelector('.close-cart');
    const cartBody = document.getElementById('cart-body');
    const cartTotal = document.getElementById('cart-total');
    const cartCount = document.querySelector('.cart-count');
    const productGrid = document.getElementById('product-grid');
    const categoryButtons = document.querySelectorAll('.category-btn');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mainNav = document.querySelector('.main-nav');
    const navLinks = document.querySelectorAll('.main-nav a'); 
    
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // Abrir/Cerrar carrito
    cartIcon.addEventListener('click', () => {
        cartModal.style.display = 'flex';
        renderCartItems();
    });
    
    closeCart.addEventListener('click', () => {
        cartModal.style.display = 'none';
    });
    
    // Cerrar carrito al hacer clic fuera
    cartModal.addEventListener('click', (e) => {
        if (e.target === cartModal) {
            cartModal.style.display = 'none';
        }
    });
    
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
            if (window.innerWidth <= 992) { // Solo si está en vista móvil
                mainNav.classList.remove('active');
                mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>'; // Volver al ícono de hamburguesa
            }
        });
    });
    
    
    // Filtrar productos por categoría
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remover active de todos los botones
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            // Agregar active al botón clickeado
            button.classList.add('active');
            
            const category = button.dataset.category;
            renderProducts(category);
        });
    });
    
    // Renderizar productos
    function renderProducts(category = 'all') {
        productGrid.innerHTML = '';
        
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
                    <div class="product-price">$${product.price.toFixed(2)}</div>
                    <div class="product-actions">
                        
                    </div>
                </div>
            `;
            productGrid.appendChild(productCard);
        });
        
        // Agregar eventos a los botones de añadir al carrito
        document.querySelectorAll('.add-to-cart').forEach(button => {
            button.addEventListener('click', addToCart);
        });
    }
    
    // Añadir al carrito
    function addToCart(e) {
        const productId = parseInt(e.target.dataset.id);
        const product = products.find(p => p.id === productId);
        
        const existingItem = cart.find(item => item.id === productId);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                ...product,
                quantity: 1
            });
        }
        
        updateCart();
        showAddedToCartMessage(product.name);
    }
    
    // Mostrar mensaje de producto añadido
    function showAddedToCartMessage(productName) {
        const message = document.createElement('div');
        message.className = 'cart-message';
        message.innerHTML = `
            <span>${productName} añadido al carrito</span>
        `;
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            message.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(message);
            }, 300);
        }, 3000);
    }
    
    // Renderizar items del carrito
    function renderCartItems() {
        if (cart.length === 0) {
            cartBody.innerHTML = '<p class="empty-cart">Tu carrito está vacío</p>';
            cartTotal.textContent = '$0.00';
            return;
        }
        
        cartBody.innerHTML = '';
        let total = 0;
        
        cart.forEach(item => {
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <img src="${item.image}" alt="${item.name}" class="cart-item-img">
                <div class="cart-item-info">
                    <h4 class="cart-item-title">${item.name}</h4>
                    <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
                    <div class="cart-item-actions">
                        <button class="quantity-btn minus" data-id="${item.id}">-</button>
                        <span class="quantity">${item.quantity}</span>
                        <button class="quantity-btn plus" data-id="${item.id}">+</button>
                        <span class="remove-item" data-id="${item.id}"><i class="fas fa-trash"></i></span>
                    </div>
                </div>
            `;
            cartBody.appendChild(cartItem);
            
            total += item.price * item.quantity;
        });
        
        cartTotal.textContent = `$${total.toFixed(2)}`;
        
        // Agregar eventos a los botones de cantidad y eliminar
        document.querySelectorAll('.minus').forEach(btn => {
            btn.addEventListener('click', decreaseQuantity);
        });
        
        document.querySelectorAll('.plus').forEach(btn => {
            btn.addEventListener('click', increaseQuantity);
        });
        
        document.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', removeItem);
        });
    }
    
    // Disminuir cantidad
    function decreaseQuantity(e) {
        const productId = parseInt(e.target.dataset.id);
        const item = cart.find(item => item.id === productId);
        
        if (item.quantity > 1) {
            item.quantity -= 1;
        } else {
            cart = cart.filter(item => item.id !== productId);
        }
        
        updateCart();
    }
    
    // Aumentar cantidad
    function increaseQuantity(e) {
        const productId = parseInt(e.target.dataset.id);
        const item = cart.find(item => item.id === productId);
        item.quantity += 1;
        updateCart();
    }
    
    // Eliminar item
    function removeItem(e) {
        const productId = parseInt(e.target.closest('.remove-item').dataset.id);
        cart = cart.filter(item => item.id !== productId);
        updateCart();
    }
    
    // Actualizar carrito
    function updateCart() {
        localStorage.setItem('cart', JSON.stringify(cart));
        renderCartItems();
        updateCartCount();
    }
    
    // Actualizar contador del carrito
    function updateCartCount() {
        const count = cart.reduce((total, item) => total + item.quantity, 0);
        cartCount.textContent = count;
    }
    
    // Inicializar
    renderProducts();
    updateCartCount();
    
    // Estilos para el mensaje de producto añadido
    const style = document.createElement('style');
    style.textContent = `
        .cart-message {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: var(--primary-color);
            color: var(--dark-color);
            padding: 15px 30px;
            border-radius: 5px;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
            opacity: 0;
            transition: opacity 0.3s;
            z-index: 3000;
            font-weight: 600;
        }
        .cart-message.show {
            opacity: 1;
        }
    `;
    document.head.appendChild(style);
});