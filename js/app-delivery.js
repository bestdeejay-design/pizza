// Modern Delivery App - Two-column layout with sticky navigation
let menu = [];
let cart = [];
let visibleCategories = new Set();

async function loadMenu() {
    try {
        const response = await fetch('menu-complete.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        console.log('Menu loaded:', Object.keys(data.menu).length, 'categories');
        
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
        
        console.log('Total products:', menu.length);
        
        initSidebar();
        renderContent();
        setupSearch();
        
        // Активируем первую категорию при загрузке
        const firstCategory = getUniqueCategories()[0];
        if (firstCategory) {
            setActiveNav(firstCategory);
            console.log('First category activated:', firstCategory);
        }
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
    
    sidebar.innerHTML = categories.map(cat => {
        const count = menu.filter(item => {
            return item.category === cat;
        }).length;
        
        const displayName = categoryMap[cat] || cat;
        
        return `
            <div class="nav-category" data-category="${cat}" onclick="scrollToCategory('${cat}')">
                <span>${displayName}</span>
                <span class="nav-count">${count}</span>
            </div>
        `;
    }).join('');
    
    console.log('Sidebar initialized with', categories.length, 'categories');
}

function renderContent() {
    const content = document.getElementById('content');
    const categories = getUniqueCategories();
    
    console.log('Rendering categories:', categories.length);
    
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
    
    // Рендерим все категории с display:none кроме первой
    content.innerHTML = categories.map((cat, index) => {
        const productsInCategory = menu.filter(item => {
            return item.category === cat;
        });
        
        console.log(`Category ${cat}: ${productsInCategory.length} products`);
        
        const displayName = categoryMap[cat] || cat;
        const isActive = index === 0 ? '' : 'display: none;';
        
        return `
            <div class="category-section" id="category-${cat}" style="${isActive}">
                <div class="category-header">
                    <h2 class="category-title">${displayName}</h2>
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
    if (!products || products.length === 0) {
        console.warn('No products to render!');
        return '<p style="color: #86868b; padding: 40px;">В этой категории пока нет товаров</p>';
    }
    
    console.log(`Rendering ${products.length} products`);
    
    return products.map((product, idx) => {
        if (idx < 2) {
            console.log('Product sample:', product);
        }
        return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-image-wrapper">
                    <img src="${product.image}" alt="${product.title}" class="product-image" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 260 200%22><rect fill=%22%23f5f5f7%22 width=%22260%22 height=%22200%22/><text x=%22130%22 y=%22105%22 text-anchor=%22middle%22 fill=%22%2386868b%22 font-size=%2214%22>No Photo</text></svg>'">
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.title}</h3>
                    <p class="product-description">${product.description || ''}</p>
                    <div class="product-footer">
                        <span class="product-price">${product.price} ₽</span>
                        <button class="add-btn" onclick="addToCart(${product.id})">+</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function setupIntersectionObserver() {
    console.log('Setting up Intersection Observer');
    
    const options = {
        root: null,
        rootMargin: '0px', // Убрал отрицательный margin
        threshold: [0, 0.1, 0.5, 1] // Несколько порогов для лучшей чувствительности
    };
    
    const observer = new IntersectionObserver((entries) => {
        console.log('Observer triggered, entries:', entries.length);
        entries.forEach(entry => {
            console.log('Entry:', entry.target.id, 'isIntersecting:', entry.isIntersecting, 'ratio:', entry.intersectionRatio);
            if (entry.isIntersecting && entry.intersectionRatio > 0.1) {
                const categoryId = entry.target.id.replace('category-', '');
                console.log('Active category:', categoryId); // Лог для отладки
                setActiveNav(categoryId);
            }
        });
    }, options);
    
    const sections = document.querySelectorAll('.category-section');
    console.log('Observing', sections.length, 'sections');
    sections.forEach(section => {
        observer.observe(section);
    });
}

function setActiveNav(categoryId) {
    console.log('Setting active nav:', categoryId);
    const navs = document.querySelectorAll('.nav-category');
    console.log('Found nav items:', navs.length);
    
    navs.forEach(nav => {
        nav.classList.remove('active');
        if (nav.dataset.category === categoryId) {
            nav.classList.add('active');
            console.log('Activated nav for:', categoryId);
        }
    });
}

function scrollToCategory(categoryId) {
    console.log('Scrolling to category:', categoryId);
    const element = document.getElementById(`category-${categoryId}`);
    if (element) {
        // Активируем навигацию сразу при клике
        setActiveNav(categoryId);
        console.log('Navigation activated for:', categoryId);
        
        // Показываем только выбранную категорию
        document.querySelectorAll('.category-section').forEach(section => {
            section.style.display = 'none';
        });
        element.style.display = '';
        console.log('Category displayed:', categoryId);
        
        const offset = 100;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = element.getBoundingClientRect().top;
        const elementPosition = elementRect.top - bodyRect;
        const offsetPosition = elementPosition - offset;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    } else {
        console.error('Category element not found:', categoryId);
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
                    <div style="font-weight: 700; font-size: 16px; margin-bottom: 4px;">${item.title}</div>
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
