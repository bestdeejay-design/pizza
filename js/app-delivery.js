// ========================================
// MODERN DELIVERY APP
// Two-column layout with sticky navigation
// ========================================
//
// 📚 DOCUMENTATION:
// - AI_DEVELOPER_HANDBOOK.md - Полное описание архитектуры
// - AUDIT_REPORT.md - Отчет об аудите кода
// - README.md - Краткая инструкция по проекту
//
// 🔧 CRITICAL FILES:
// - menu-final.json - Канонические данные меню (333 товара, 18 категорий)
// - js/app-delivery.js - Вся логика приложения (1420 строк)
// - index.html - Главная страница
//
// ⚠️ DO NOT TOUCH:
// - archive/* - Архив старых версий
// - fix-duplicate-ids.js - Уже выполнен
//
// ========================================

// ========================================
// GLOBAL CONSTANTS
// ========================================

// Menu groups structure (used in sidebar, mobile menu, content rendering)
const MENU_GROUPS = [
    {
        title: '🍕 ПИЦЦА',
        categories: ['pizza-30cm', 'piccolo-20cm', 'calzone']
    },
    {
        title: '🍣 СУШИ & РОЛЛЫ',
        categories: ['rolls-sushi', 'rolls-rolls']
    },
    {
        title: '🍞 ХЛЕБ И ФОКАЧЧА',
        categories: ['bread-focaccia-bread', 'bread-focaccia-focaccia']
    },
    {
        title: '🍱 НАБОРЫ',
        categories: ['combo']
    },
    {
        title: '🍰 ДЕСЕРТЫ',
        categories: ['confectionery']
    },
    {
        title: '🥤 НАПИТКИ',
        categories: ['mors', 'juice', 'water', 'soda', 'beverages-other']
    },
    {
        title: '👨‍🍳 ГОТОВИМ ДОМА',
        categories: ['frozen', 'aromatic-oils']
    },
    {
        title: 'ℹ️ ИНФОРМАЦИЯ',
        categories: ['masterclass', 'franchise', 'contacts']
    }
];

// Category display names mapping
const CATEGORY_MAP = {
    'pizza-30cm': 'Пицца 30 см',
    'piccolo-20cm': 'Pizza Piccolo 20 см',
    'calzone': 'Кальцоне',
    'bread-focaccia-bread': 'Хлеб',
    'bread-focaccia-focaccia': 'Фокачча',
    'sauce': 'Соусы',
    'rolls-sushi': 'Суши',
    'rolls-rolls': 'Роллы',
    'combo': 'Комбо наборы',
    'confectionery': 'Кондитерские изделия',
    'mors': 'Морсы',
    'juice': 'Соки',
    'water': 'Вода',
    'soda': 'Газировка',
    'beverages-other': 'Другие напитки',
    'frozen': 'Замороженная продукция',
    'aromatic-oils': 'Ароматное масло',
    'masterclass': 'Мастер класс',
    'franchise': 'Франшиза',
    'contacts': 'Контакты'
};

// Expected menu categories for validation
const EXPECTED_CATEGORIES = [
    'pizza-30cm', 'piccolo-20cm', 'calzone',
    'bread-focaccia-bread', 'bread-focaccia-focaccia', 'sauce',
    'rolls-sushi', 'rolls-rolls',
    'combo', 'confectionery',
    'mors', 'juice', 'water', 'soda', 'beverages-other',
    'frozen', 'aromatic-oils',
    'masterclass', 'franchise', 'contacts'
];

// Lazy loading configuration
const PRODUCTS_PER_LOAD = 12;
const SCROLL_THRESHOLD = 50;
const DELAY_BEFORE_NAVIGATE = 1500;

// ========================================
// GLOBAL VARIABLES
// ========================================
let menu = [];
let cart = [];
let lazyLoadObservers = new Map(); // Хранилище для IntersectionObserver

// Auto-navigation state
let lastScrollY = window.scrollY;
let autoNavigateEnabled = true;
let scrollAttemptCount = 0;
let reachedEndTimestamp = null;

/**
 * ЗАГРУЗКА МЕНЮ
 * 
 * @async
 * @description Fetches menu-final.json, validates structure, flattens to array,
 *              initializes UI components (sidebar, mobile menu, content),
 *              restores state from localStorage.
 * 
 * 📚 SEE ALSO: AI_DEVELOPER_HANDBOOK.md → Section 1: "Загрузка Данных"
 * 
 * ⚠️ CRITICAL:
 * - Uses data.menu[category] NOT data[category]
 * - Flattens nested structure to flat array
 * - Error handling via try/catch
 * 
 * @returns {Promise<void>}
 */
async function loadMenu() {
    try {
        const response = await fetch('menu-final.json');
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
            ...(data.menu['bread-focaccia-bread'] || []),
            ...(data.menu['bread-focaccia-focaccia'] || []),
            ...(data.menu['sauce'] || []),
            ...(data.menu['rolls-sushi'] || []),
            ...(data.menu['rolls-rolls'] || []),
            ...(data.menu['combo'] || []),
            ...(data.menu['confectionery'] || []),
            ...(data.menu['mors'] || []),
            ...(data.menu['juice'] || []),
            ...(data.menu['water'] || []),
            ...(data.menu['soda'] || []),
            ...(data.menu['beverages-other'] || []),
            ...(data.menu['frozen'] || []),
            ...(data.menu['aromatic-oils'] || []),
            ...(data.menu['masterclass'] || []),
            ...(data.menu['franchise'] || [])
        ];
        
        console.log('Total products:', menu.length);
        
        initSidebar();
        initMobileMenu(); // Инициализация мобильного меню
        renderContentWithLazyLoad();
        setupSearch();
        restoreState(); // Восстанавливаем состояние после загрузки контента
        
        console.log('Menu initialization complete');
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
    
    // Логическая группировка категорий пиццерии
    const menuGroups = [
        {
            title: '🍕 ПИЦЦА',
            categories: ['pizza-30cm', 'piccolo-20cm', 'calzone']
        },
        {
            title: '🍣 СУШИ & РОЛЛЫ',
            categories: ['rolls-sushi', 'rolls-rolls']
        },
        {
            title: '🍞 ХЛЕБ И ФОКАЧЧА',
            categories: ['bread-focaccia-bread', 'bread-focaccia-focaccia']
        },
        {
            title: '🍱 НАБОРЫ',
            categories: ['combo']
        },
        {
            title: '🍰 ДЕСЕРТЫ',
            categories: ['confectionery']
        },
        {
            title: '🥤 НАПИТКИ',
            categories: ['mors', 'juice', 'water', 'soda', 'beverages-other']
        },
        {
            title: '👨‍🍳 ГОТОВИМ ДОМА',
            categories: ['frozen', 'aromatic-oils']
        },
        {
            title: 'ℹ️ ИНФОРМАЦИЯ',
            categories: ['masterclass', 'franchise', 'contacts']
        }
    ];
    
    // Карта русских названий
    const categoryMap = {
        'pizza-30cm': 'Пицца 30 см',
        'piccolo-20cm': 'Pizza Piccolo 20 см',
        'calzone': 'Кальцоне',
        'bread-focaccia-bread': 'Хлеб',
        'bread-focaccia-focaccia': 'Фокачча',
        'sauce': 'Соусы',
        'rolls-sushi': 'Суши',
        'rolls-rolls': 'Роллы',
        'combo': 'Комбо наборы',
        'confectionery': 'Кондитерские изделия',
        'mors': 'Морсы',
        'juice': 'Соки',
        'water': 'Вода',
        'soda': 'Газировка',
        'beverages-other': 'Другие напитки',
        'frozen': 'Замороженная продукция',
        'aromatic-oils': 'Ароматное масло',
        'masterclass': 'Мастер класс',
        'franchise': 'Франшиза',
        'contacts': 'Контакты'
    };
    
    // Рендерим сгруппированное меню
    let html = '';
    menuGroups.forEach(group => {
        // Добавляем заголовок группы
        html += `<div style="padding: 16px 20px 8px; font-size: 13px; font-weight: 700; color: #ff2e55; text-transform: uppercase; letter-spacing: 0.5px;">${group.title}</div>`;
        
        // Добавляем категории группы
        group.categories.forEach(cat => {
            // Контакты всегда показываем, остальные только если есть товары
            if (cat === 'contacts' || categories.includes(cat)) {
                const count = cat === 'contacts' ? 3 : menu.filter(item => item.category === cat).length;
                const displayName = categoryMap[cat] || cat;
                
                html += `
                    <div class="nav-category" data-category="${cat}" onclick="scrollToCategory('${cat}')">
                        <span>${displayName}</span>
                        <span class="nav-count">${count}</span>
                    </div>
                `;
            }
        });
        
        // Добавляем разделитель между группами
        html += `<div style="height: 1px; background: #e5e5ea; margin: 12px 20px;"></div>`;
    });
    
    sidebar.innerHTML = html;
    
    console.log('Sidebar initialized with grouped menu');
}

function renderContent() {
    const content = document.getElementById('content');
    
    // Собираем все категории в правильном порядке
    const orderedCategories = [];
    MENU_GROUPS.forEach(group => {
        group.categories.forEach(cat => {
            if (cat === 'contacts' || menu.some(item => item.category === cat)) {
                orderedCategories.push(cat);
            }
        });
    });
    
    console.log('Rendering categories in order:', orderedCategories.length);
    
    // Рендерим все категории с display:none кроме первой
    content.innerHTML = orderedCategories.map((cat, index) => {
        const productsInCategory = menu.filter(item => {
            return item.category === cat;
        });
        
        console.log(`Category ${cat}: ${productsInCategory.length} products`);
        
        const displayName = categoryMap[cat] || cat;
        const isActive = index === 0 ? '' : 'display: none;';
        
        // Для контактов - специальный рендеринг
        if (cat === 'contacts') {
            return `
                <div class="category-section" id="category-${cat}" style="${isActive}">
                    <div class="category-header">
                        <h2 class="category-title">📍 Контакты</h2>
                        <p class="category-subtitle">Наши пиццерии и способы связи</p>
                    </div>
                    <div class="contacts-grid">
                        <!-- Location 1 (Main) -->
                        <div class="contact-card primary">
                            <h3 class="contact-card-title">🍕 Pizza Napoli 1</h3>
                            <div class="contact-info-item">
                                <span class="contact-icon">📞</span>
                                <div>
                                    <div class="contact-label">Телефон:</div>
                                    <div class="contact-value"><a href="tel:+79991699839" style="color: inherit; text-decoration: none;">+7 (999) 169-98-39</a></div>
                                </div>
                            </div>
                            <div class="contact-info-item">
                                <span class="contact-icon">📍</span>
                                <div>
                                    <div class="contact-label">Адрес:</div>
                                    <div class="contact-value">Санкт-Петербург, улица Бабушкина 53, стр. 1, Невский район</div>
                                </div>
                            </div>
                            <div class="contact-info-item">
                                <span class="contact-icon">⏰</span>
                                <div>
                                    <div class="contact-label">Режим работы:</div>
                                    <div class="contact-value">с 10:00 до 22:00 без выходных</div>
                                </div>
                            </div>
                            <div class="contact-info-item">
                                <span class="contact-icon">💳</span>
                                <div>
                                    <div class="contact-label">Оплата:</div>
                                    <div class="payment-methods">
                                        <span class="payment-badge">Наличными</span>
                                        <span class="payment-badge">Картой</span>
                                        <span class="payment-badge">Переводом</span>
                                        <span class="payment-badge">Безналичным платежом</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Location 2 (Opening Soon) -->
                        <div class="contact-card opening-soon">
                            <div class="opening-badge">🎉 Скоро открытие!</div>
                            <h3 class="contact-card-title">🍕 Pizza Napoli 2.0</h3>
                            <div class="contact-info-item">
                                <span class="contact-icon">📍</span>
                                <div>
                                    <div class="contact-label">Адрес:</div>
                                    <div class="contact-value">Санкт-Петербург, Московский район</div>
                                </div>
                            </div>
                            <div class="contact-info-item">
                                <span class="contact-icon">🎯</span>
                                <div>
                                    <div class="contact-label">Особенности:</div>
                                    <div class="contact-value">Большой зал, летняя веранда, детская комната</div>
                                </div>
                            </div>
                            <div class="contact-info-item">
                                <span class="contact-icon">🎁</span>
                                <div>
                                    <div class="contact-label">Открытие:</div>
                                    <div class="contact-value">Следите за новостями! Скидки до 50% в день открытия</div>
                                </div>
                            </div>
                        </div>

                        <!-- Map -->
                        <div class="map-container">
                            <div class="map-placeholder">
                                <div class="map-pin location-1" title="Pizza Napoli 1 - ул. Бабушкина 53">📍</div>
                                <div class="map-pin location-2" title="Pizza Napoli 2.0 - Московский район (скоро)">📍</div>
                                <span>Интерактивная карта с локациями пиццерий</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Обычный рендеринг для категорий с товарами
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
                    <div class="product-actions">
                        <div class="product-weight">${product.weight || ''}${product.weight ? ' г' : ''}</div>
                        <div class="product-price">${product.price} ₽</div>
                        <button class="add-to-cart" onclick="addToCart(${product.id})">В корзину</button>
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
        
        // СБРОС ПЕРЕМЕННЫХ НАВИГАЦИИ ПРИ ПЕРЕКЛЮЧЕНИИ КАТЕГОРИИ
        scrollAttemptCount = 0;
        reachedEndTimestamp = null;
        autoNavigateEnabled = true;
        
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

// Mobile Menu Functions
function initMobileMenu() {
    const mobileMenuContent = document.getElementById('mobile-menu-content');
    const categories = getUniqueCategories();
    
    // Логическая группировка категорий пиццерии
    const menuGroups = [
        {
            title: '🍕 ПИЦЦА',
            categories: ['pizza-30cm', 'piccolo-20cm', 'calzone']
        },
        {
            title: '🍣 СУШИ & РОЛЛЫ',
            categories: ['rolls-sushi', 'rolls-rolls']
        },
        {
            title: '🍞 ХЛЕБ И ФОКАЧЧА',
            categories: ['bread-focaccia-bread', 'bread-focaccia-focaccia']
        },
        {
            title: '🍱 НАБОРЫ',
            categories: ['combo']
        },
        {
            title: '🍰 ДЕСЕРТЫ',
            categories: ['confectionery']
        },
        {
            title: '🥤 НАПИТКИ',
            categories: ['mors', 'juice', 'water', 'soda', 'beverages-other']
        },
        {
            title: '👨‍🍳 ГОТОВИМ ДОМА',
            categories: ['frozen', 'aromatic-oils']
        },
        {
            title: 'ℹ️ ИНФОРМАЦИЯ',
            categories: ['masterclass', 'franchise', 'contacts']
        }
    ];
    
    // Карта русских названий
    const categoryMap = {
        'pizza-30cm': 'Пицца 30 см',
        'piccolo-20cm': 'Pizza Piccolo 20 см',
        'calzone': 'Кальцоне',
        'bread-focaccia-bread': 'Хлеб',
        'bread-focaccia-focaccia': 'Фокачча',
        'sauce': 'Соусы',
        'rolls-sushi': 'Суши',
        'rolls-rolls': 'Роллы',
        'combo': 'Комбо наборы',
        'confectionery': 'Кондитерские изделия',
        'mors': 'Морсы',
        'juice': 'Соки',
        'water': 'Вода',
        'soda': 'Газировка',
        'beverages-other': 'Другие напитки',
        'frozen': 'Замороженная продукция',
        'aromatic-oils': 'Ароматное масло',
        'masterclass': 'Мастер класс',
        'franchise': 'Франшиза',
        'contacts': 'Контакты'
    };
    
    // Рендерим мобильное меню
    let html = '';
    menuGroups.forEach(group => {
        // Добавляем заголовок группы
        html += `<div class="mobile-group-title">${group.title}</div>`;
        
        // Добавляем категории группы
        group.categories.forEach(cat => {
            // Контакты всегда показываем, остальные только если есть товары
            if (cat === 'contacts' || categories.includes(cat)) {
                const count = cat === 'contacts' ? 3 : menu.filter(item => item.category === cat).length;
                const displayName = categoryMap[cat] || cat;
                
                html += `
                    <div class="mobile-nav-category" data-category="${cat}" onclick="selectMobileCategory('${cat}')">
                        <span>${displayName}</span>
                        <span class="mobile-nav-count">${count}</span>
                    </div>
                `;
            }
        });
        
        // Добавляем разделитель между группами
        html += `<div class="mobile-divider"></div>`;
    });
    
    mobileMenuContent.innerHTML = html;
}

function toggleMobileMenu() {
    const btn = document.querySelector('.mobile-menu-btn');
    const sidebar = document.getElementById('mobile-sidebar');
    
    btn.classList.toggle('active');
    sidebar.classList.toggle('active');
    
    // Блокируем скролл body когда меню открыто
    if (sidebar.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

// Закрытие мобильного меню при клике на контент
document.addEventListener('DOMContentLoaded', () => {
    const content = document.getElementById('content');
    const sidebar = document.getElementById('mobile-sidebar');
    const menuBtn = document.querySelector('.mobile-menu-btn');
    
    if (content && sidebar) {
        content.addEventListener('click', (e) => {
            // Закрываем меню если клик не по кнопке меню
            if (sidebar.classList.contains('active') && !menuBtn.contains(e.target)) {
                toggleMobileMenu();
            }
        });
    }
});

function selectMobileCategory(categoryId) {
    // Закрываем меню
    toggleMobileMenu();
    
    // Переключаем категорию
    scrollToCategory(categoryId);
}

// ========================================
// STATE PERSISTENCE FUNCTIONS
// ========================================

function saveState() {
    const activeCategory = document.querySelector('.nav-category.active');
    if (activeCategory) {
        const categoryId = activeCategory.dataset.category;
        localStorage.setItem('pizzaMenu_activeCategory', categoryId);
        localStorage.setItem('pizzaMenu_scrollPosition', window.scrollY);
        console.log('State saved:', categoryId, window.scrollY);
    }
}

function restoreState() {
    const savedCategory = localStorage.getItem('pizzaMenu_activeCategory');
    const savedPosition = localStorage.getItem('pizzaMenu_scrollPosition');
    
    // Если есть сохраненная категория - восстанавливаем
    if (savedCategory) {
        console.log('Restoring category:', savedCategory);
        setActiveNav(savedCategory);
        
        // Показываем только сохраненную категорию
        document.querySelectorAll('.category-section').forEach(section => {
            section.style.display = 'none';
        });
        const activeSection = document.getElementById(`category-${savedCategory}`);
        if (activeSection) {
            activeSection.style.display = '';
            console.log('Restored category:', savedCategory);
        } else {
            console.warn('Saved category not found in DOM:', savedCategory);
        }
    } else {
        // Первый вход - открываем первую категорию (пицца)
        console.log('First visit - showing first category (pizza-30cm)');
        setActiveNav('pizza-30cm');
        
        // Скрываем все категории кроме первой
        document.querySelectorAll('.category-section').forEach((section, index) => {
            if (index > 0) {
                section.style.display = 'none';
            }
        });
    }
    
    if (savedPosition) {
        console.log('Restoring scroll position:', savedPosition);
        setTimeout(() => {
            window.scrollTo({
                top: parseInt(savedPosition),
                behavior: 'auto'
            });
        }, 100); // Небольшая задержка чтобы контент успел отрендериться
    }
}

// Сохраняем состояние перед выгрузкой страницы
window.addEventListener('beforeunload', saveState);

// ========================================
// LAZY LOADING FUNCTIONS
// ========================================

function renderContentWithLazyLoad() {
    const content = document.getElementById('content');
    
    // Используем тот же порядок, что и в сайдбаре
    const menuGroups = [
        {
            title: '🍕 ПИЦЦА',
            categories: ['pizza-30cm', 'piccolo-20cm', 'calzone']
        },
        {
            title: '🥗 ЗАКУСКИ',
            categories: ['bread-focaccia-bread', 'bread-focaccia-focaccia', 'sauce', 'rolls-sushi', 'rolls-rolls']
        },
        {
            title: '🍱 КОМБО НАБОРЫ',
            categories: ['combo']
        },
        {
            title: '🍰 ДЕССЕРТЫ',
            categories: ['confectionery']
        },
        {
            title: '🥤 НАПИТКИ',
            categories: ['mors', 'juice', 'water', 'soda', 'beverages-other']
        },
        {
            title: 'ℹ️ ИНФОРМАЦИЯ',
            categories: ['frozen', 'aromatic-oils', 'masterclass', 'franchise', 'contacts']
        }
    ];
    
    // Карта русских названий
    const categoryMap = {
        'pizza-30cm': 'Пицца 30 см',
        'piccolo-20cm': 'Pizza Piccolo 20 см',
        'calzone': 'Кальцоне',
        'bread-focaccia-bread': 'Хлеб',
        'bread-focaccia-focaccia': 'Фокачча',
        'sauce': 'Соусы',
        'rolls-sushi': 'Суши',
        'rolls-rolls': 'Роллы',
        'combo': 'Комбо наборы',
        'confectionery': 'Кондитерские изделия',
        'mors': 'Морсы',
        'juice': 'Соки',
        'water': 'Вода',
        'soda': 'Газировка',
        'beverages-other': 'Другие напитки',
        'frozen': 'Замороженная продукция',
        'aromatic-oils': 'Ароматное масло',
        'masterclass': 'Мастер класс',
        'franchise': 'Франшиза',
        'contacts': 'Контакты'
    };
    
    // Собираем все категории в правильном порядке
    const orderedCategories = [];
    menuGroups.forEach(group => {
        group.categories.forEach(cat => {
            if (cat === 'contacts' || menu.some(item => item.category === cat)) {
                orderedCategories.push(cat);
            }
        });
    });
    
    console.log('Rendering categories in order:', orderedCategories.length);
    
    // Рендерим все категории с display:none кроме первой
    content.innerHTML = orderedCategories.map((cat, index) => {
        const productsInCategory = menu.filter(item => {
            return item.category === cat;
        });
        
        console.log(`Category ${cat}: ${productsInCategory.length} products`);
        
        const displayName = categoryMap[cat] || cat;
        const isActive = index === 0 ? '' : 'display: none;';
        
        // Для контактов - специальный рендеринг (лента карточек)
        if (cat === 'contacts') {
            return `
                <div class="category-section" id="category-${cat}" style="${isActive}">
                    <div class="category-header">
                        <h2 class="category-title">📍 Контакты</h2>
                        <p class="category-subtitle">Наши пиццерии и способы связи</p>
                    </div>
                    <div class="products-grid" id="grid-${cat}" data-loaded="0">
                        ${renderContactsLazy()}
                    </div>
                </div>
            `;
        }
        
        // Обычный рендеринг для категорий с товарами
        return `
            <div class="category-section" id="category-${cat}" style="${isActive}" data-category="${cat}">
                <div class="category-header">
                    <h2 class="category-title">${displayName}</h2>
                    <p class="category-subtitle">${productsInCategory.length} товаров</p>
                </div>
                <div class="products-grid" id="grid-${cat}" data-loaded="0">
                    ${renderProductsLazy(productsInCategory)}
                </div>
                ${productsInCategory.length > PRODUCTS_PER_LOAD ? `<div class="lazy-load-more" style="text-align: center; padding: 40px 20px;"><button class="load-more-btn" onclick="loadMoreProducts('${cat}', event)" style="padding: 12px 40px; background: #2a582c; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 16px;">Показать еще</button></div>` : ''}
            </div>
        `;
    }).join('');
    
    // Инициализируем lazy loading для каждой категории кроме контактов
    orderedCategories.forEach(cat => {
        if (cat !== 'contacts') {
            setupLazyLoading(cat);
        }
    });
}

function renderProductsLazy(products) {
    if (!products || products.length === 0) {
        console.warn('No products to render!');
        return '<p style="color: #86868b; padding: 40px;">В этой категории пока нет товаров</p>';
    }
    
    // Рендерим только первую порцию товаров
    const initialProducts = products.slice(0, PRODUCTS_PER_LOAD);
    
    console.log(`Rendering ${initialProducts.length} of ${products.length} products (lazy load)`);
    
    return initialProducts.map((product, idx) => {
        if (idx < 2) {
            console.log('Product sample:', product);
        }
        // Проверка поддержки WebP и fallback для старых браузеров
        const imageSrc = product.image;
        const imageHtml = `<picture>
            <source srcset="${imageSrc}" type="image/webp">
            <img src="${imageSrc.replace('.webp', '.jpg')}" alt="${product.title}" class="product-image" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 260 200%22><rect fill=%22%23f5f5f7%22 width=%22260%22 height=%22200%22/><text x=%22130%22 y=%22105%22 text-anchor=%22middle%22 fill=%22%2386868b%22 font-size=%2214%22>No Photo</text></svg>'">
        </picture>`;
        return `
            <div class="product-card" data-id="${product.id}" style="opacity: 0; transform: translateY(20px); animation: fadeInUp 0.5s ease forwards; animation-delay: ${idx * 0.05}s;" onclick="showProductModal(${product.id})">
                <div class="product-image-wrapper">
                    ${imageHtml}
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.title}</h3>
                    <div class="product-footer">
                        <span class="product-price">${product.price} ₽</span>
                        <button class="add-btn" onclick="event.stopPropagation(); addToCart(${product.id})">+</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderContactsLazy() {
    const contacts = [
        {
            id: 'contact-1',
            title: '🍕 Pizza Napoli 1',
            subtitle: 'Основная пиццерия',
            image: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 260 200%22><rect fill=%22%23ff2e55%22 width=%22260%22 height=%22200%22/><text x=%22130%22 y=%2290%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2260%22 font-weight=%22bold%22>🍕</text><text x=%22130%22 y=%22140%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2216%22>Pizza Napoli 1</text></svg>',
            description: 'ул. Бабушкина 53, стр. 1, Невский район',
            phone: '+7 (999) 169-98-39',
            hours: 'с 10:00 до 22:00 без выходных',
            payment: 'Наличными • Картой • Переводом • Безналичным платежом',
            badge: null
        },
        {
            id: 'contact-2',
            title: '🍕 Pizza Napoli 2.0',
            subtitle: 'Скоро открытие!',
            image: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 260 200%22><rect fill=%22%23ff6b6b%22 width=%22260%22 height=%22200%22/><text x=%22130%22 y=%2290%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2260%22 font-weight=%22bold%22>🎉</text><text x=%22130%22 y=%22140%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2216%22>Скоро!</text></svg>',
            description: 'Московский район • Большой зал, летняя веранда, детская комната',
            phone: null,
            hours: 'Открытие скоро!',
            payment: 'Следите за новостями! Скидки до 50%',
            badge: '🎉 Скоро открытие!'
        },
        {
            id: 'contact-3',
            title: '🍕 Pizza Napoli 3',
            subtitle: 'Новая локация',
            image: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 260 200%22><rect fill=%22%232a582c%22 width=%22260%22 height=%22200%22/><text x=%22130%22 y=%2290%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2260%22 font-weight=%22bold%22>🍕</text><text x=%22130%22 y=%22140%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2216%22>Pizza Napoli 3</text></svg>',
            description: 'Приморский район • Просторный зал, панорамные окна, уютная атмосфера',
            phone: null,
            hours: 'с 10:00 до 23:00 без выходных',
            payment: null,
            badge: null
        }
    ];
    
    return contacts.map((contact, idx) => `
        <div class="product-card contact-card-lazy" style="opacity: 0; transform: translateY(20px); animation: fadeInUp 0.5s ease forwards; animation-delay: ${idx * 0.1}s;">
            <div class="product-image-wrapper" style="height: 160px; position: relative;">
                <img src="${contact.image}" alt="${contact.title}" class="product-image">
                ${contact.badge ? `<div class="opening-badge" style="position: absolute; top: 10px; right: 10px;">${contact.badge}</div>` : ''}
            </div>
            <div class="product-info">
                <h3 class="product-name" style="font-size: 18px; margin-bottom: 4px;">${contact.title}</h3>
                <p style="color: #86868b; font-size: 13px; margin-bottom: 12px;">${contact.subtitle}</p>
                <p style="margin-bottom: 12px; line-height: 1.5;">${contact.description}</p>
                ${contact.phone ? `
                    <div style="margin-bottom: 8px;">
                        <strong style="color: #ff2e55;">📞 </strong>
                        <a href="tel:${contact.phone.replace(/\s/g, '')}" style="color: inherit; text-decoration: none; font-weight: 600;">${contact.phone}</a>
                    </div>
                ` : ''}
                ${contact.hours ? `
                    <div style="margin-bottom: 8px;">
                        <strong style="color: #ff2e55;">⏰ </strong>
                        <span>${contact.hours}</span>
                    </div>
                ` : ''}
                ${contact.payment ? `
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.1); font-size: 12px; color: #86868b; line-height: 1.6;">
                        <strong style="color: #ff2e55;">💳 Оплата:</strong> ${contact.payment}
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

/**
 * ЛЕНИВАЯ ЗАГРУЗКА ТОВАРОВ
 * 
 * @param {string} categoryId - Category key (e.g., 'pizza-30cm')
 * @description Loads products in batches of PRODUCTS_PER_LOAD (12).
 *              Creates IntersectionObserver on "Load More" button.
 *              Marks category as ready for auto-navigation when complete.
 * 
 * 📚 SEE ALSO: AI_DEVELOPER_HANDBOOK.md → Section 3: "Ленивая Загрузка"
 * 
 * ⚙️ CONFIGURATION:
 * - PRODUCTS_PER_LOAD = 12 items per batch
 * - rootMargin = '100px' (start loading before button visible)
 * - threshold = 0.1 (trigger when 10% of button visible)
 * 
 * 🔧 CRITICAL:
 * - Uses lazyLoadObservers Map to store observers
 * - Sets dataset.readyToNavigate = 'true' when all loaded
 * - Removes load more button when complete
 */
function setupLazyLoading(categoryId) {
    const gridElement = document.getElementById(`grid-${categoryId}`);
    if (!gridElement) return;
    
    // Для all-menu берем все товары, иначе фильтруем по категории
    const productsInCategory = categoryId === 'all-menu' ? menu : menu.filter(item => item.category === categoryId);
    const totalProducts = productsInCategory.length;
    let loadedCount = parseInt(gridElement.dataset.loaded) || PRODUCTS_PER_LOAD;
    
    // Создаем observer для отслеживания видимости последних карточек
    const options = {
        root: null,
        rootMargin: '100px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && loadedCount < totalProducts) {
                // Пользователь доскроллил до конца - загружаем еще
                loadMoreProducts(categoryId, false); // false = не через кнопку, а автоматически
            }
        });
    }, options);
    
    // Наблюдаем за последними карточками
    const productCards = gridElement.querySelectorAll('.product-card');
    if (productCards.length > 0) {
        const lastCard = productCards[productCards.length - 1];
        observer.observe(lastCard);
        lazyLoadObservers.set(categoryId, { observer, loadedCount });
    }
}

function loadMoreProducts(categoryId, event = null) {
    // Предотвращаем всплытие события клика
    if (event) {
        event.stopPropagation();
    }
    
    const gridElement = document.getElementById(`grid-${categoryId}`);
    if (!gridElement) return;
    
    // Фильтруем по категории
    const productsInCategory = menu.filter(item => item.category === categoryId);
    const totalProducts = productsInCategory.length;
    
    const observerData = lazyLoadObservers.get(categoryId);
    let loadedCount = observerData ? observerData.loadedCount : PRODUCTS_PER_LOAD;
    
    // Загружаем следующую порцию
    const nextBatch = productsInCategory.slice(loadedCount, loadedCount + PRODUCTS_PER_LOAD);
    
    if (nextBatch.length === 0) {
        console.log('No more products to load');
        return;
    }
    
    console.log(`Loading ${nextBatch.length} more products for ${categoryId}`);
    
    // Рендерим новые карточки
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = nextBatch.map((product, idx) => `
        <div class="product-card" data-id="${product.id}" style="opacity: 0; transform: translateY(20px); animation: fadeInUp 0.5s ease forwards; animation-delay: ${idx * 0.05}s;" onclick="showProductModal(${product.id})">
            <div class="product-image-wrapper">
                <img src="${product.image}" alt="${product.title}" class="product-image" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 260 200%22><rect fill=%22%23f5f5f7%22 width=%22260%22 height=%22200%22/><text x=%22130%22 y=%22105%22 text-anchor=%22middle%22 fill=%22%2386868b%22 font-size=%2214%22>No Photo</text></svg>'">
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.title}</h3>
                <div class="product-footer">
                    <span class="product-price">${product.price} ₽</span>
                    <button class="add-btn" onclick="event.stopPropagation(); addToCart(${product.id})">+</button>
                </div>
            </div>
        </div>
    `).join('');
    
    Array.from(tempDiv.children).forEach(card => {
        gridElement.appendChild(card);
    });
    
    loadedCount += nextBatch.length;
    gridElement.dataset.loaded = loadedCount;
    
    console.log(`Loaded ${loadedCount}/${totalProducts} products for ${categoryId}`);
    
    // Обновляем observer
    if (observerData) {
        observerData.observer.disconnect();
    }
    
    // Пересоздаем observer для новых карточек
    setupLazyLoading(categoryId);
    
    // Если загрузили все товары - убираем кнопку и разрешаем авто-переход
    if (loadedCount >= totalProducts) {
        const loadMoreContainer = gridElement.parentElement.querySelector('.lazy-load-more');
        if (loadMoreContainer) {
            loadMoreContainer.remove();
            console.log(`Removed load more button for ${categoryId} - all products loaded`);
        }
        // Помечаем категорию как "готовую к переходу"
        gridElement.dataset.readyToNavigate = 'true';
        console.log(`Category ${categoryId} ready to auto-navigate`);
    }
}

// Переход к следующей категории когда все товары загружены
function navigateToNextCategory(currentCategoryId) {
    const orderedCategories = getOrderedCategories();
    const currentIndex = orderedCategories.indexOf(currentCategoryId);
    
    if (currentIndex !== -1 && currentIndex < orderedCategories.length - 1) {
        const nextCategoryId = orderedCategories[currentIndex + 1];
        console.log(`Auto-navigating to next category: ${nextCategoryId}`);
        
        // Сбрасываем флаг готовности для текущей категории
        const currentGrid = document.getElementById(`grid-${currentCategoryId}`);
        if (currentGrid) {
            currentGrid.dataset.readyToNavigate = 'false';
        }
        
        // Разблокируем авто-навигацию для следующей категории
        autoNavigateEnabled = true;
        scrollAttemptCount = 0;
        reachedEndTimestamp = null;
        
        // Небольшая задержка для плавности
        setTimeout(() => {
            scrollToCategory(nextCategoryId);
        }, 800);
    } else {
        console.log('This is the last category - no more auto-navigation');
    }
}

// Переход к предыдущей категории при скролле вверх
function navigateToPreviousCategory(currentCategoryId) {
    const orderedCategories = getOrderedCategories();
    const currentIndex = orderedCategories.indexOf(currentCategoryId);
    
    if (currentIndex > 0) {
        const prevCategoryId = orderedCategories[currentIndex - 1];
        console.log(`Navigating to previous category: ${prevCategoryId}`);
        
        // Проверяем готова ли предыдущая категория (все ли товары загружены)
        const prevGrid = document.getElementById(`grid-${prevCategoryId}`);
        if (prevGrid) {
            scrollToCategory(prevCategoryId);
            
            // Если предыдущая категория еще не полностью загружена - помечаем что можно вернуться
            const loadedCount = parseInt(prevGrid.dataset.loaded || 0);
            const totalInCategory = menu.filter(item => item.category === prevCategoryId).length;
            
            if (loadedCount < totalInCategory) {
                console.log(`Previous category ${prevCategoryId} not fully loaded yet (${loadedCount}/${totalInCategory})`);
            }
        }
    }
}

// Получение списка категорий в правильном порядке
function getOrderedCategories() {
    const menuGroups = [
        { title: '🍕 ПИЦЦА', categories: ['pizza-30cm', 'piccolo-20cm', 'calzone'] },
        { title: '🍣 СУШИ & РОЛЛЫ', categories: ['rolls-sushi', 'rolls-rolls'] },
        { title: '🍞 ХЛЕБ И ФОКАЧЧА', categories: ['bread-focaccia-bread', 'bread-focaccia-focaccia'] },
        { title: '🍱 НАБОРЫ', categories: ['combo'] },
        { title: '🍰 ДЕСЕРТЫ', categories: ['confectionery'] },
        { title: '🥤 НАПИТКИ', categories: ['mors', 'juice', 'water', 'soda', 'beverages-other'] },
        { title: '👨‍🍳 ГОТОВИМ ДОМА', categories: ['frozen', 'aromatic-oils'] },
        { title: 'ℹ️ ИНФОРМАЦИЯ', categories: ['masterclass', 'franchise', 'contacts'] }
    ];
    
    const orderedCategories = [];
    const uniqueCategories = getUniqueCategories();
    
    menuGroups.forEach(group => {
        group.categories.forEach(cat => {
            if (cat === 'contacts' || uniqueCategories.includes(cat)) {
                orderedCategories.push(cat);
            }
        });
    });
    
    return orderedCategories;
}

// Модальное окно с подробной информацией о товаре
function showProductModal(productId) {
    const product = menu.find(p => p.id === productId);
    if (!product) return;
    
    const modal = document.getElementById('product-modal');
    if (!modal) {
        // Создаем модальное окно если его нет
        createProductModal();
    }
    
    const modalElement = document.getElementById('product-modal');
    const contentDiv = document.getElementById('product-modal-content');
    
    // Инициализируем количество товара
    let productQuantity = 1;
    
    // Формируем расширенную карточку с вертикальной компоновкой
    contentDiv.innerHTML = `
        <div class="product-modal-vertical">
            <!-- Верхняя часть - Изображение -->
            <div class="product-modal-image-top">
                <img src="${product.image}" alt="${product.title}" class="product-modal-image-top-img">
                <button onclick="closeProductModal()" class="product-modal-close-btn" aria-label="Закрыть">✕</button>
            </div>
            
            <!-- Нижняя часть - Информация -->
            <div class="product-modal-info-bottom">
                <h2 class="product-modal-title-bottom">
                    ${product.title}
                    ${product.weight ? `<span class="product-weight-badge">${product.weight} г</span>` : ''}
                </h2>
                
                <!-- Дополнения (если есть) -->
                ${product.addons && product.addons.length > 1 ? `
                <div class="addons-block-compact">
                    <div class="addons-list">
                        ${product.addons.map(addon => `
                            <span class="addon-item-small">${addon}</span>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                <div class="price-quantity-block">
                    <div class="price-section">
                        <span class="price-value-large">${product.price} ₽</span>
                    </div>
                    
                    <!-- Компактный счётчик количества справа от цены -->
                    <div class="quantity-selector-compact">
                        <button class="quantity-btn-small minus" onclick="decreaseQuantity()" aria-label="Уменьшить">−</button>
                        <span class="quantity-value-small" id="quantity-value">1</span>
                        <button class="quantity-btn-small plus" onclick="increaseQuantity()" aria-label="Увеличить">+</button>
                    </div>
                </div>
                
                <button onclick="addToCartFromModal(${product.id})" class="product-modal-add-btn-large">
                    <span>Добавить в корзину</span>
                </button>
                
                ${product.description ? `
                    <div class="product-modal-description-compact">
                        ${product.description}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    modalElement.classList.add('active');
    setTimeout(() => {
        modalElement.style.display = 'flex';
        // Сохраняем ID текущего товара
        currentProductId = productId;
        productQuantity = 1;
        // Устанавливаем фокус на кнопку закрытия для доступности
        const closeBtn = modalElement.querySelector('.product-modal-close-btn');
        if (closeBtn) {
            closeBtn.focus();
        }
    }, 0);
    document.body.style.overflow = 'hidden';
}

function closeProductModal() {
    const modal = document.getElementById('product-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Управление количеством товара в модальном окне
let currentProductId = null;
let productQuantity = 1;

function increaseQuantity() {
    if (productQuantity < 99) {
        productQuantity++;
        updateQuantityDisplay();
    }
}

function decreaseQuantity() {
    if (productQuantity > 1) {
        productQuantity--;
        updateQuantityDisplay();
    }
}

function updateQuantityDisplay() {
    const quantityEl = document.getElementById('quantity-value');
    
    if (quantityEl) {
        quantityEl.textContent = productQuantity;
    }
}

function addToCartFromModal(productId) {
    // Добавляем товар нужное количество раз
    for (let i = 0; i < productQuantity; i++) {
        addToCart(productId);
    }
    // Сбрасываем количество и закрываем
    productQuantity = 1;
    updateQuantityDisplay();
    closeProductModal();
}

function createProductModal() {
    const modal = document.createElement('div');
    modal.id = 'product-modal';
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100vh;
        background: rgba(0,0,0,0.8);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        overflow-y: auto;
        padding: 20px;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.id = 'product-modal-content';
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Закрытие по клику на overlay
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeProductModal();
        }
    });
    
    // Закрытие по клавише ESC
    modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.keyCode === 27) {
            closeProductModal();
        }
    });
}

// Анимация появления карточек
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);

// Отслеживание скролла для авто-перехода между категориями
// Переменные уже объявлены в глобальной области (строки 94-97)

window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;
    const isScrollingDown = currentScrollY > lastScrollY;
    const isScrollingUp = currentScrollY < lastScrollY;
    
    // Ищем текущую видимую категорию
    const visibleCategory = getVisibleCategory();
    
    if (visibleCategory && autoNavigateEnabled) {
        const gridElement = document.getElementById(`grid-${visibleCategory}`);
        
        if (gridElement && gridElement.dataset.readyToNavigate === 'true') {
            const rect = gridElement.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            const scrollHeight = document.documentElement.scrollHeight;
            const maxScroll = scrollHeight - windowHeight;
            
            // Проверка: достигли ли мы конца категории
            const atEndOfCategory = rect.bottom <= windowHeight + 100;
            
            if (atEndOfCategory) {
                // Достигли конца категории - запоминаем время
                if (!reachedEndTimestamp) {
                    reachedEndTimestamp = Date.now();
                    console.log(`Reached end of ${visibleCategory}, waiting for user intent...`);
                }
                
                // Если прошло достаточно времени и пользователь все еще пытается скроллить вниз
                const timeSinceReached = Date.now() - reachedEndTimestamp;
                
                if (isScrollingDown && timeSinceReached > DELAY_BEFORE_NAVIGATE) {
                    // Проверяем насколько далеко за пределами
                    const distancePastEnd = currentScrollY - (maxScroll - 100);
                    
                    if (distancePastEnd > SCROLL_THRESHOLD) {
                        scrollAttemptCount++;
                        console.log(`Scroll attempt ${scrollAttemptCount} past end of ${visibleCategory}`);
                        
                        // Если несколько попыток - переходим
                        if (scrollAttemptCount >= 2) {
                            console.log(`User confirmed intent - navigating to next category`);
                            autoNavigateEnabled = false;
                            navigateToNextCategory(visibleCategory);
                            scrollAttemptCount = 0;
                            reachedEndTimestamp = null;
                        }
                    }
                }
            } else {
                // Ушли с конца категории - сбрасываем
                reachedEndTimestamp = null;
                scrollAttemptCount = 0;
            }
            
            // Проверка для возврата к предыдущей категории (скролл вверх)
            if (isScrollingUp && rect.top > -100) {
                const orderedCategories = getOrderedCategories();
                const currentIndex = orderedCategories.indexOf(visibleCategory);
                
                // Если это не первая категория и мы у самого начала текущей
                if (currentIndex > 0 && rect.top > 0) {
                    console.log(`User scrolled to top of ${visibleCategory} - navigating to previous`);
                    autoNavigateEnabled = false; // Блокируем повторные срабатывания
                    navigateToPreviousCategory(visibleCategory);
                }
            }
        } else if (gridElement && gridElement.dataset.readyToNavigate !== 'true') {
            // Категория еще не готова к переходу
            reachedEndTimestamp = null;
            scrollAttemptCount = 0;
        }
    } else if (!visibleCategory) {
        // Нет видимой категории - сброс
        reachedEndTimestamp = null;
        scrollAttemptCount = 0;
    }
    
    lastScrollY = currentScrollY;
}, { passive: true });

// Получение текущей видимой категории
function getVisibleCategory() {
    const categories = document.querySelectorAll('.category-section:not([style*="display: none"])');
    
    for (const category of categories) {
        const rect = category.getBoundingClientRect();
        // Категория видима хотя бы частично
        if (rect.top < window.innerHeight && rect.bottom > 0) {
            return category.dataset.category;
        }
    }
    
    return null;
}

document.addEventListener('DOMContentLoaded', loadMenu);

