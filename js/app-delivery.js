// Modern Delivery App - Two-column layout with sticky navigation
let menu = [];
let cart = [];
let visibleCategories = new Set();

async function loadMenu() {
    try {
        const response = await fetch('menu-complete.json');
        const data = await response.json();
        
        // Flatten all products from nested structure
        menu = [
            ...(data['pizza-30cm'] || []),
            ...(data['piccolo-20cm'] || []),
            ...(data['calzone'] || []),
            ...(data['bread-focaccia'] || []),
            ...(data['sauce'] || []),
            ...(data['rolls'] || []),
            ...(data['combo'] || []),
            ...(data['confectionery'] || []),
            ...(data['beverages'] || []),
            ...(data['frozen'] || []),
            ...(data['aromatic-oils'] || []),
            ...(data['masterclass'] || []),
            ...(data['franchise'] || [])
        ];
        
        initSidebar();
        renderContent();
        setupIntersectionObserver();
        setupSearch();
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

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const categories = getUniqueCategories();
    
    sidebar.innerHTML = categories.map(cat => {
        const count = menu.filter(item => {
            return item.category === cat;
        }).length;
        
        return `
            <div class="nav-category" data-category="${cat}" onclick="scrollToCategory('${cat}')">
                <span>${cat}</span>
                <span class="nav-count">${count}</span>
            </div>
        `;
    }).join('');
}

function renderContent() {
    const content = document.getElementById('content');
    const categories = getUniqueCategories();
    
    content.innerHTML = categories.map(cat => {
        const productsInCategory = menu.filter(item => {
            return item.category === cat;
        });
        
        return `
            <div class="category-section" id="category-${cat}">
                <div class="category-header">
                    <h2 class="category-title">${cat}</h2>
                    <p class="category-subtitle">${productsInCategory.length} товаров</p>
                </div>
                <div class="products-grid">
                    ${renderProducts(productsInCategory)}
                </div>
            </div>
        `;
    }).join('');
}

function renderProducts(products) {
    return products.map(product => `
        <div class="product-card" data-id="${product.id}">
            <div class="product-image-wrapper">
                <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 260 200%22><rect fill=%22%23f5f5f7%22 width=%22260%22 height=%22200%22/><text x=%22130%22 y=%22105%22 text-anchor=%22middle%22 fill=%22%2386868b%22 font-size=%2214%22>No Photo</text></svg>'">
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description || 'Вкусное блюдо из нашего меню'}</p>
                <div class="product-footer">
                    <span class="product-price">${product.price} ₽</span>
                    <button class="add-btn" onclick="addToCart(${product.id})">+</button>
                </div>
            </div>
        </div>
    `).join('');
}

function setupIntersectionObserver() {
    const options = {
        root: null,
        rootMargin: '-100px',
        threshold: 0
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const categoryId = entry.target.id.replace('category-', '');
                setActiveNav(categoryId);
            }
        });
    }, options);
    
    document.querySelectorAll('.category-section').forEach(section => {
        observer.observe(section);
    });
}

function setActiveNav(categoryId) {
    document.querySelectorAll('.nav-category').forEach(nav => {
        nav.classList.remove('active');
        if (nav.dataset.category === categoryId) {
            nav.classList.add('active');
        }
    });
}

function scrollToCategory(categoryId) {
    const element = document.getElementById(`category-${categoryId}`);
    if (element) {
        const offset = 100;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = element.getBoundingClientRect().top;
        const elementPosition = elementRect.top - bodyRect;
        const offsetPosition = elementPosition - offset;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
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
    
    updateCartTotal();
    animateCartButton();
}

function updateCartTotal() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('cart-total').textContent = `${total} ₽`;
}

function animateCartButton() {
    const cartBtn = document.querySelector('.cart-mini');
    cartBtn.style.animation = 'none';
    setTimeout(() => {
        cartBtn.style.animation = 'pulse 0.3s ease-in-out';
    }, 10);
}

function showCart() {
    const modal = document.getElementById('cart-modal');
    const itemsContainer = document.getElementById('cart-items');
    
    if (cart.length === 0) {
        itemsContainer.innerHTML = '<p style="text-align: center; color: #86868b; padding: 40px 0;">Корзина пуста</p>';
    } else {
        itemsContainer.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div>
                    <div style="font-weight: 700; font-size: 16px; margin-bottom: 4px;">${item.name}</div>
                    <div style="color: #86868b; font-size: 14px;">${item.quantity} × ${item.price} ₽</div>
                </div>
                <div style="font-weight: 800; color: #ff2e55;">${item.quantity * item.price} ₽</div>
            </div>
        `).join('');
    }
    
    modal.style.display = 'flex';
}

function hideCart() {
    document.getElementById('cart-modal').style.display = 'none';
}

document.getElementById('cart-modal')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        hideCart();
    }
});

function setupSearch() {
    const searchInput = document.querySelector('.search-mini');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        if (query.length < 2) {
            document.querySelectorAll('.product-card').forEach(card => {
                card.style.display = '';
            });
            return;
        }
        
        document.querySelectorAll('.product-card').forEach(card => {
            const name = card.querySelector('.product-name').textContent.toLowerCase();
            const desc = card.querySelector('.product-description').textContent.toLowerCase();
            const matches = name.includes(query) || desc.includes(query);
            card.style.display = matches ? '' : 'none';
        });
    });
}

document.addEventListener('DOMContentLoaded', loadMenu);
