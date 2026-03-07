// Modern Delivery App - Two-column layout with sticky navigation
let menu = [];
let cart = [];
let visibleCategories = new Set();
let lazyLoadObservers = new Map(); // Хранилище для IntersectionObserver
const PRODUCTS_PER_LOAD = 12; // Количество товаров для первоначальной загрузки

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
            title: '📋 МЕНЮ',
            categories: ['all-menu'] // Новый пункт - все товары одной лентой
        },
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

// Кнопка возврата к общему меню
function showBackToAllMenuButton() {
    let backBtn = document.getElementById('back-to-all-menu');
    if (!backBtn) {
        // Создаем кнопку если её нет
        backBtn = document.createElement('div');
        backBtn.id = 'back-to-all-menu';
        backBtn.innerHTML = '<i class="fas fa-list"></i> Все меню';
        backBtn.onclick = () => scrollToCategory('all-menu');
        backBtn.style.cssText = `
            position: fixed;
            bottom: 90px;
            right: 20px;
            background: linear-gradient(135deg, #ff2e55 0%, #ff6b6b 100%);
            color: white;
            padding: 12px 24px;
            border-radius: 50px;
            cursor: pointer;
            font-weight: 700;
            font-size: 14px;
            z-index: 999;
            box-shadow: 0 8px 30px rgba(255, 46, 85, 0.4);
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s;
            backdrop-filter: blur(10px);
        `;
        backBtn.onmouseenter = () => {
            backBtn.style.transform = 'scale(1.05)';
            backBtn.style.boxShadow = '0 12px 40px rgba(255, 46, 85, 0.5)';
        };
        backBtn.onmouseleave = () => {
            backBtn.style.transform = 'scale(1)';
            backBtn.style.boxShadow = '0 8px 30px rgba(255, 46, 85, 0.4)';
        };
        document.body.appendChild(backBtn);
    }
    backBtn.style.display = 'flex';
}

function scrollToCategory(categoryId) {
    console.log('Scrolling to category:', categoryId);
    
    // Специальная обработка для all-menu
    if (categoryId === 'all-menu') {
        const element = document.getElementById(`category-${categoryId}`);
        if (element) {
            setActiveNav(categoryId);
            document.querySelectorAll('.category-section').forEach(section => {
                section.style.display = 'none';
            });
            element.style.display = '';
            console.log('All-menu category displayed');
            
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            
            // Скрываем кнопку "Все меню" когда в общем меню
            const backToAllMenuBtn = document.getElementById('back-to-all-menu');
            if (backToAllMenuBtn) {
                backToAllMenuBtn.style.display = 'none';
            }
        }
        return;
    }
    
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
        
        // Показываем кнопку "Все меню" когда в конкретной категории
        showBackToAllMenuButton();
        
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
            title: '📋 МЕНЮ',
            categories: ['all-menu'] // Новый пункт - все товары одной лентой
        },
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
    const hasVisitedBefore = sessionStorage.getItem('pizzaMenu_visited');
    
    // Если пользователь зашел не в первый раз - восстанавливаем категорию
    if (savedCategory && hasVisitedBefore) {
        console.log('Restoring category:', savedCategory);
        setActiveNav(savedCategory);
        
        // Показываем только сохраненную категорию
        document.querySelectorAll('.category-section').forEach(section => {
            section.style.display = 'none';
        });
        const activeSection = document.getElementById(`category-${savedCategory}`);
        if (activeSection) {
            activeSection.style.display = '';
        }
    } else {
        // Первый вход - открываем all-menu по умолчанию
        console.log('First visit - showing all-menu by default');
        setActiveNav('all-menu');
        sessionStorage.setItem('pizzaMenu_visited', 'true');
    }
    
    if (savedPosition && hasVisitedBefore) {
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
            title: '📋 МЕНЮ',
            categories: ['all-menu'] // Все товары одной лентой
        },
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
            if (cat === 'contacts' || cat === 'all-menu' || menu.some(item => item.category === cat)) {
                orderedCategories.push(cat);
            }
        });
    });
    
    console.log('Rendering categories in order:', orderedCategories.length);
    
    // Рендерим все категории с display:none кроме первой
    content.innerHTML = orderedCategories.map((cat, index) => {
        let productsInCategory = [];
        
        // Специальная обработка для "all-menu" - все товары одной лентой
        if (cat === 'all-menu') {
            productsInCategory = menu; // Все товары подряд
        } else {
            productsInCategory = menu.filter(item => {
                return item.category === cat;
            });
        }
        
        console.log(`Category ${cat}: ${productsInCategory.length} products`);
        
        const displayName = cat === 'all-menu' ? '📋 Общее меню' : (categoryMap[cat] || cat);
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
        return `
            <div class="product-card" data-id="${product.id}" style="opacity: 0; transform: translateY(20px); animation: fadeInUp 0.5s ease forwards; animation-delay: ${idx * 0.05}s;">
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
    
    // Для all-menu берем все товары, иначе фильтруем по категории
    const productsInCategory = categoryId === 'all-menu' ? menu : menu.filter(item => item.category === categoryId);
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
        <div class="product-card" data-id="${product.id}" style="opacity: 0; transform: translateY(20px); animation: fadeInUp 0.5s ease forwards; animation-delay: ${idx * 0.05}s;">
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
    
    // Если загрузили все товары - убираем кнопку
    if (loadedCount >= totalProducts) {
        const loadMoreContainer = gridElement.parentElement.querySelector('.lazy-load-more');
        if (loadMoreContainer) {
            loadMoreContainer.remove();
            console.log(`Removed load more button for ${categoryId} - all products loaded`);
        }
    }
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

document.addEventListener('DOMContentLoaded', loadMenu);
