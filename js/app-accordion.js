// Accordion Menu App - Progressive disclosure UX with smooth animations
let menu = [];
let cart = [];
const INITIAL_ITEMS = 6;

async function loadMenu() {
    try {
        const response = await fetch('menu-complete.json');
        const data = await response.json();
        
        // Flatten all products from nested structure
        menu = [
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
        
        renderAccordion();
    } catch (error) {
        console.error('Error loading menu:', error);
    }
}

function getUniqueCategories() {
    const categories = new Set();
    menu.forEach(item => {
        if (item.category) {
            categories.add(item.category);
        }
    });
    return Array.from(categories).sort();
}

function renderAccordion() {
    const accordion = document.getElementById('accordion');
    const categories = getUniqueCategories();
    const icons = ['🍕', '🍝', '🥗', '🍹', '🍰', '🥪', '🌮', '🍜', '🍱', '🧁', '🍩', '🍪', '☕'];
    
    accordion.innerHTML = categories.map((cat, index) => {
        const productsInCategory = menu.filter(item => {
            return item.category === cat;
        });
        
        const icon = icons[index % icons.length];
        
        // Map Russian names to English keys
        const categoryMap = {
            'pizza-30cm': 'Пицца 30 см',
            'piccolo-20cm': 'Pizza Piccolo 20 см',
            'calzone': 'Кальцоне',
            'bread-focaccia': 'Хлеб и Фокачча',
            'sauce': 'Соусы',
            'rolls': 'Роллы',
            'combo': 'Комбо наборы',
            'confectionery': 'Кондитерские изделия',
            'beverages': 'Напитки',
            'frozen': 'Замороженная продукция',
            'aromatic-oils': 'Ароматное масло',
            'masterclass': 'Мастер класс',
            'franchise': 'Франшиза'
        };
        
        const displayName = categoryMap[cat] || cat;
        
        return `
            <div class="accordion-item" data-category="${cat}">
                <div class="accordion-header" onclick="toggleAccordion('${cat}')">
                    <div class="accordion-title">
                        <div class="category-icon">${icon}</div>
                        <div class="category-info">
                            <h3>${displayName}</h3>
                            <div class="category-count">${productsInCategory.length} товаров</div>
                        </div>
                    </div>
                    <div class="accordion-arrow">▼</div>
                </div>
                <div class="accordion-content">
                    <div class="products-wrapper">
                        <div class="products-grid" id="products-${cat}" data-visible="${INITIAL_ITEMS}">
                            ${renderProducts(productsInCategory.slice(0, INITIAL_ITEMS))}
                        </div>
                        ${productsInCategory.length > INITIAL_ITEMS ? `
                            <button class="load-more" onclick="loadMore('${cat}')" style="display: block">
                                Показать ещё (${productsInCategory.length - INITIAL_ITEMS})
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderProducts(products) {
    return products.map(product => `
        <div class="product-card" data-id="${product.id}">
            <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 280 200%22><rect fill=%22%23e9ecef%22 width=%22280%22 height=%22200%22/><text x=%22140%22 y=%22105%22 text-anchor=%22middle%22 fill=%22%23adb5bd%22 font-size=%2214%22>No Photo</text></svg>'">
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description || 'Вкусное блюдо из нашего меню'}</p>
                <div class="product-footer">
                    <span class="product-price">${product.price} ₽</span>
                    <button class="add-btn" onclick="addToCart(${product.id})">В корзину</button>
                </div>
            </div>
        </div>
    `).join('');
}

function toggleAccordion(category) {
    const item = document.querySelector(`.accordion-item[data-category="${category}"]`);
    const wasActive = item.classList.contains('active');
    
    // Close all accordions
    document.querySelectorAll('.accordion-item').forEach(acc => {
        acc.classList.remove('active');
    });
    
    // Open clicked if it wasn't active
    if (!wasActive) {
        item.classList.add('active');
        // Smooth scroll to accordion content
        setTimeout(() => {
            item.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

function loadMore(category) {
    const productsGrid = document.getElementById(`products-${category}`);
    const currentVisible = parseInt(productsGrid.dataset.visible);
    const increment = 6;
    
    const productsInCategory = menu.filter(item => {
        return item.category === category;
    });
    
    const nextVisible = Math.min(currentVisible + increment, productsInCategory.length);
    const productsToShow = productsInCategory.slice(0, nextVisible);
    
    productsGrid.innerHTML = renderProducts(productsToShow);
    productsGrid.dataset.visible = nextVisible;
    
    // Update or hide load more button
    const loadMoreBtn = productsGrid.nextElementSibling;
    if (loadMoreBtn && loadMoreBtn.classList.contains('load-more')) {
        if (nextVisible >= productsInCategory.length) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.textContent = `Показать ещё (${productsInCategory.length - nextVisible})`;
        }
    }
}

function addToCart(productId) {
    const product = menu.find(p => p.id === productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    
    updateCartCount();
    animateCartButton();
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-count').textContent = count;
}

function animateCartButton() {
    const cartBtn = document.querySelector('.cart-float');
    cartBtn.style.animation = 'none';
    setTimeout(() => {
        cartBtn.style.animation = 'pulse 0.3s ease-in-out';
    }, 10);
}

function showCart() {
    const modal = document.getElementById('cart-modal');
    const itemsContainer = document.getElementById('cart-items');
    
    if (cart.length === 0) {
        itemsContainer.innerHTML = '<p style="text-align: center; color: #718096; padding: 40px 0;">Корзина пуста</p>';
    } else {
        itemsContainer.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div>
                    <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px;">${item.name}</div>
                    <div style="color: #718096; font-size: 14px;">${item.quantity} × ${item.price} ₽</div>
                </div>
                <div style="font-weight: 700; color: #667eea;">${item.quantity * item.price} ₽</div>
            </div>
        `).join('');
    }
    
    modal.style.display = 'flex';
}

function hideCart() {
    document.getElementById('cart-modal').style.display = 'none';
}

// Close modal on overlay click
document.getElementById('cart-modal')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        hideCart();
    }
});

// Search functionality
document.querySelector('.search-input')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    
    if (query.length < 2) {
        document.querySelectorAll('.product-card').forEach(card => {
            card.style.display = '';
        });
        return;
    }
    
    let foundCount = 0;
    document.querySelectorAll('.product-card').forEach(card => {
        const name = card.querySelector('.product-name').textContent.toLowerCase();
        const desc = card.querySelector('.product-description').textContent.toLowerCase();
        const matches = name.includes(query) || desc.includes(query);
        card.style.display = matches ? '' : 'none';
        if (matches) foundCount++;
    });
    
    // Auto-expand categories with results
    if (foundCount > 0) {
        document.querySelectorAll('.accordion-item').forEach(item => {
            const hasVisibleProducts = item.querySelectorAll('.product-card[style=""]').length > 0;
            if (hasVisibleProducts) {
                item.classList.add('active');
            }
        });
    }
});

// Initialize app
document.addEventListener('DOMContentLoaded', loadMenu);
