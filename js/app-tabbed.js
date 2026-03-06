// Tabbed Menu App - UX focused on category-based navigation with pagination
let menu = [];
let cart = [];
const ITEMS_PER_PAGE = 8;

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
        
        initTabs();
        renderAllCategories();
    } catch (error) {
        console.error('Error loading menu:', error);
    }
}

function initTabs() {
    const tabsContainer = document.getElementById('category-tabs');
    const categories = getUniqueCategories();
    
    tabsContainer.innerHTML = `
        <button class="tab-btn active" data-category="all">Все</button>
        ${categories.map(cat => `
            <button class="tab-btn" data-category="${cat}">${cat}</button>
        `).join('')}
    `;
    
    tabsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-btn')) {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            switchCategory(e.target.dataset.category);
        }
    });
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

function switchCategory(category) {
    document.querySelectorAll('.category-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(`category-${category}`);
    if (targetSection) {
        targetSection.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function renderAllCategories() {
    const container = document.getElementById('categories-container');
    const categories = getUniqueCategories();
    
    container.innerHTML = categories.map((cat, index) => {
        const productsInCategory = menu.filter(item => {
            return item.category === cat;
        });
        
        return `
            <div class="category-section ${index === 0 ? 'active' : ''}" id="category-${cat}">
                <div class="category-header">
                    <h2 class="category-title">${cat}</h2>
                    <p class="category-count">${productsInCategory.length} товаров</p>
                </div>
                <div class="products-list" id="products-${cat}">
                    ${renderProductList(productsInCategory.slice(0, ITEMS_PER_PAGE))}
                </div>
                ${productsInCategory.length > ITEMS_PER_PAGE ? `
                    <div class="pagination" data-category="${cat}" data-page="1" data-total="${Math.ceil(productsInCategory.length / ITEMS_PER_PAGE)}">
                        ${renderPagination(1, Math.ceil(productsInCategory.length / ITEMS_PER_PAGE))}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    // Add pagination listeners
    document.querySelectorAll('.pagination').forEach(pagination => {
        pagination.addEventListener('click', handlePaginationClick);
    });
}

function renderProductList(products) {
    return products.map(product => `
        <div class="product-item" data-id="${product.id}">
            <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 120 120%22><rect fill=%22%23f8f9fa%22 width=%22120%22 height=%22120%22/><text x=%2260%22 y=%2265%22 text-anchor=%22middle%22 fill=%22%23adb5bd%22>No Photo</text></svg>'">
            <div class="product-details">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description || 'Вкусное блюдо из нашего меню'}</p>
                <div class="product-meta">
                    <span class="product-price">${product.price} ₽</span>
                </div>
            </div>
            <button class="add-btn" onclick="addToCart(${product.id})">
                <span>+</span> В корзину
            </button>
        </div>
    `).join('');
}

function renderPagination(currentPage, totalPages) {
    let html = '';
    
    // Previous button
    html += `<button class="page-btn ${currentPage === 1 ? 'disabled' : ''}" data-page="${currentPage - 1}">←</button>`;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<span style="padding: 0 8px;">...</span>`;
        }
    }
    
    // Next button
    html += `<button class="page-btn ${currentPage === totalPages ? 'disabled' : ''}" data-page="${currentPage + 1}">→</button>`;
    
    return html;
}

function handlePaginationClick(e) {
    if (!e.target.classList.contains('page-btn')) return;
    
    const pagination = e.target.closest('.pagination');
    const category = pagination.dataset.category;
    const currentPage = parseInt(pagination.dataset.page);
    const totalPages = parseInt(pagination.dataset.total);
    const newPage = parseInt(e.target.dataset.page);
    
    if (newPage < 1 || newPage > totalPages) return;
    
    const productsInCategory = menu.filter(item => {
        return item.category === category;
    });
    
    const startIndex = (newPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const productsToShow = productsInCategory.slice(startIndex, endIndex);
    
    document.getElementById(`products-${category}`).innerHTML = renderProductList(productsToShow);
    
    // Update pagination
    pagination.dataset.page = newPage;
    pagination.innerHTML = renderPagination(newPage, totalPages);
    
    // Smooth scroll to products
    document.getElementById(`products-${category}`).scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
    });
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
    const cartBtn = document.querySelector('.cart-badge');
    cartBtn.style.animation = 'none';
    setTimeout(() => {
        cartBtn.style.animation = 'pulse 0.3s ease-in-out';
    }, 10);
}

function showCart() {
    const modal = document.getElementById('cart-modal');
    const itemsContainer = document.getElementById('cart-items');
    
    if (cart.length === 0) {
        itemsContainer.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 40px 0;">Корзина пуста</p>';
    } else {
        itemsContainer.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div>
                    <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px;">${item.name}</div>
                    <div style="color: #6c757d; font-size: 14px;">${item.quantity} × ${item.price} ₽</div>
                </div>
                <div style="font-weight: 700; color: #ff6b6b;">${item.quantity * item.price} ₽</div>
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
        document.querySelectorAll('.product-item').forEach(item => {
            item.style.display = '';
        });
        return;
    }
    
    document.querySelectorAll('.product-item').forEach(item => {
        const name = item.querySelector('.product-name').textContent.toLowerCase();
        const desc = item.querySelector('.product-description').textContent.toLowerCase();
        const matches = name.includes(query) || desc.includes(query);
        item.style.display = matches ? '' : 'none';
    });
});

// Initialize app
document.addEventListener('DOMContentLoaded', loadMenu);
