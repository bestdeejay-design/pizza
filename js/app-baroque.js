// ===== STATE =====
let cart = [];
let currentFilter = 'all';
let searchQuery = '';

// ===== LOAD MENU =====
async function loadMenu() {
    try {
        const response = await fetch('menu-complete.json');
        const data = await response.json();
        
        // Flatten all products from new structure
        const allProducts = [
            ...(data.menu['pizza-30cm'] || []),
            ...(data.menu['piccolo-20cm'] || []),
            ...(data.menu['calzone'] || []),
            ...(data.menu['bread-focaccia'] || []),
            ...(data.menu['sauce'] || []),
            ...(data.menu['rolls'] || []),
            ...(data.menu['combo'] || []),
            ...(data.menu['confectionery'] || []),
            ...(data.menu['beverages'] || []),
            ...(data.menu['frozen'] || []),
            ...(data.menu['aromatic-oils'] || []),
            ...(data.menu['masterclass'] || []),
            ...(data.menu['franchise'] || [])
        ];
        
        renderProducts(allProducts);
        
    } catch (error) {
        console.error('Ошибка загрузки меню:', error);
    }
}

// ===== RENDER PRODUCTS =====
function renderProducts(products) {
    const grid = document.getElementById('productsGrid');
    
    if (!grid) return;
    
    grid.innerHTML = '';
    
    const filtered = products.filter(product => {
        if (currentFilter === 'all') {
            return !searchQuery || product.title.toLowerCase().includes(searchQuery.toLowerCase());
        }
        
        // Special handling for combined categories
        if (currentFilter === 'bread-focaccia') {
            return product.category === 'bread-focaccia';
        }
        
        // Match category or subcategory
        const matchesFilter = product.category === currentFilter;
        const matchesSearch = !searchQuery || product.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });
    
    filtered.forEach(product => {
        const card = createProductCard(product);
        grid.appendChild(card);
    });
}

// ===== CREATE PRODUCT CARD =====
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    // Placeholder image if no photo
    const placeholderImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="280" height="200"%3E%3Crect fill="%23f5f5f5" width="280" height="200"/%3E%3Ctext fill="%23ccc" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="14"%3ENo Photo%3C/text%3E%3C/svg%3E';
    
    const imageSrc = product.image || placeholderImage;
    
    card.innerHTML = `
        <img src="${imageSrc}" alt="${product.title}" class="product-image" loading="lazy">
        <div class="product-info">
            <h3 class="product-title">${product.title}</h3>
            <p class="product-price">${product.price} ₽</p>
            <button class="add-to-cart" data-id="${product.id}">В корзину</button>
        </div>
    `;
    
    // Add to cart handler
    const btn = card.querySelector('.add-to-cart');
    btn.addEventListener('click', () => addToCart(product));
    
    return card;
}

// ===== ADD TO CART =====
function addToCart(product) {
    const existing = cart.find(item => item.id === product.id);
    
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }
    
    updateCart();
    showAddedAnimation(btn);
}

// ===== UPDATE CART =====
function updateCart() {
    const countEl = document.querySelector('.cart-count');
    const itemsEl = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotal');
    const promoInfoEl = document.getElementById('promoInfo');
    const freeProgressEl = document.getElementById('freeProgress');
    
    if (!countEl) return;
    
    // Update count
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    countEl.textContent = totalCount;
    
    // Update total price
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (totalEl) totalEl.textContent = totalPrice;
    
    // Update promo info (13th item free)
    const itemsUntilFree = 13 - (totalCount % 13);
    const isFree = totalCount > 0 && totalCount % 13 === 0;
    
    if (promoInfoEl && freeProgressEl) {
        if (isFree) {
            promoInfoEl.textContent = '🎉 Вам доступна бесплатная позиция!';
            freeProgressEl.textContent = '0';
        } else {
            promoInfoEl.textContent = `До бесплатной позиции: ${itemsUntilFree}`;
            freeProgressEl.textContent = itemsUntilFree;
        }
    }
    
    // Render cart items
    renderCartItems();
}

// ===== RENDER CART ITEMS =====
function renderCartItems() {
    const itemsEl = document.getElementById('cartItems');
    if (!itemsEl) return;
    
    if (cart.length === 0) {
        itemsEl.innerHTML = '<p>Корзина пуста</p>';
        return;
    }
    
    itemsEl.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div>
                <strong>${item.title}</strong><br>
                ${item.price} ₽ × ${item.quantity}
            </div>
            <div>
                <button onclick="decreaseQuantity(${item.id})">-</button>
                <span style="margin: 0 10px;">${item.quantity}</span>
                <button onclick="increaseQuantity(${item.id})">+</button>
            </div>
        </div>
    `).join('');
}

// ===== INCREASE/DECREASE QUANTITY =====
function increaseQuantity(id) {
    const item = cart.find(i => i.id === id);
    if (item) {
        item.quantity++;
        updateCart();
    }
}

function decreaseQuantity(id) {
    const item = cart.find(i => i.id === id);
    if (item) {
        item.quantity--;
        if (item.quantity === 0) {
            cart = cart.filter(i => i.id !== id);
        }
        updateCart();
    }
}

// ===== SHOW ADDED ANIMATION =====
function showAddedAnimation(btn) {
    btn.textContent = '✓ Добавлено';
    btn.style.background = '#4CAF50';
    
    setTimeout(() => {
        btn.textContent = 'В корзину';
        btn.style.background = '#2a582c';
    }, 1000);
}

// ===== FILTER HANDLERS =====
function initFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            filterBtns.forEach(b => b.classList.remove('active'));
            // Add active to clicked
            btn.classList.add('active');
            // Update filter
            currentFilter = btn.dataset.filter;
            loadMenu();
        });
    });
}

// ===== SEARCH HANDLER =====
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        loadMenu();
    });
}

// ===== CART MODAL =====
function initCartModal() {
    const cartBtn = document.getElementById('cartBtn');
    const cartModal = document.getElementById('cartModal');
    const closeCart = document.getElementById('closeCart');
    
    if (!cartBtn || !cartModal) return;
    
    cartBtn.addEventListener('click', () => {
        cartModal.style.display = 'block';
        renderCartItems();
    });
    
    if (closeCart) {
        closeCart.addEventListener('click', () => {
            cartModal.style.display = 'none';
        });
    }
    
    // Close on outside click
    window.addEventListener('click', (e) => {
        if (e.target === cartModal) {
            cartModal.style.display = 'none';
        }
    });
}

// ===== SMOOTH SCROLL =====
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    loadMenu();
    initFilters();
    initSearch();
    initCartModal();
    initSmoothScroll();
});
