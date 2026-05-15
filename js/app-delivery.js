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

// Константы из config.js
const MENU_GROUPS = window.CATEGORY_GROUPS || [];
const CATEGORY_MAP = window.CATEGORY_MAP || {};
const ORDER_SOURCES = window.ORDER_SOURCES || {};

// Expected menu categories for validation
const EXPECTED_CATEGORIES = window.CATEGORY_MAP ? Object.keys(window.CATEGORY_MAP) : [
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

// localStorage keys
const CART_STORAGE_KEY = 'pizzaCart';

// ========================================
// GLOBAL VARIABLES
// ========================================
let menu = [];
let cart = loadCartFromStorage();
let lazyLoadObservers = new Map(); // Хранилище для IntersectionObserver
let loadedGroups = 3; // Сколько групп показывать сразу (для lazy loading)
let totalGroups = 0;
let selectedGift = null; // Выбранный подарок

// ========================================
// GIFT LEVELS CONFIG
// ========================================
const GIFT_THRESHOLDS = [
    { threshold: 750, name: 'Бесплатная доставка', price: 0, icon: 'fa-truck' },
    { threshold: 1250, name: 'Неаполитанский хлеб Классический', price: 100, icon: 'fa-bread-slice' },
    { threshold: 1750, name: 'Сок яблочный собственного производства', price: 150, icon: 'fa-glass-cheers' },
    { threshold: 2250, name: 'Кальцоне-мини "4 сыра"', price: 400, icon: 'fa-pizza-slice' },
    { threshold: 2750, name: 'Pizza Piccolo 4 сыра', price: 700, icon: 'fa-pizza-slice' },
    { threshold: 3250, name: 'Пицца 4 сыра', price: 850, icon: 'fa-pizza-slice' },
    { threshold: 3750, name: 'Ролл Филадельфия с лососем', price: 850, icon: 'fa-fish' }
];

function loadCartFromStorage() {
    try {
        const raw = localStorage.getItem(CART_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.warn('Cart restore failed, starting empty:', e);
        return [];
    }
}

function saveCart() {
    try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
        console.warn('Cart save failed:', e);
    }
}

function clearCart() {
    cart = [];
    selectedGift = null;
    saveCart();
    updateCartTotal();
}

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
        restoreState(); // Восстанавливаем состояние после загрузки контента
        updateCartTotal(); // Отрисовать счётчик корзины из localStorage

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
    
    // Рендерим сгруппированное меню
    let html = '';
    MENU_GROUPS.forEach(group => {
        // Добавляем заголовок группы
        html += `<div style="padding: 16px 20px 8px; font-size: 13px; font-weight: 700; color: #ff2e55; text-transform: uppercase; letter-spacing: 0.5px;">${group.title}</div>`;
        
        // Добавляем категории группы
        group.categories.forEach(cat => {
            // Информационные разделы показываем всегда
            if (cat === 'contacts' || cat === 'legal' || cat === 'masterclass' || cat === 'franchise' || categories.includes(cat)) {
                const count = (cat === 'legal' || cat === 'masterclass' || cat === 'franchise') ? 0 : (cat === 'contacts' ? 2 : menu.filter(item => item.category === cat).length);
                const displayName = CATEGORY_MAP[cat] || cat;
                
                html += `
                    <div class="nav-category" data-category="${cat}" onclick="scrollToCategory('${cat}')">
                        <span>${displayName}</span>
                        ${count > 0 ? `<span class="nav-count">${count}</span>` : ''}
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

    saveCart();
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

function getTimeStatus() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const timeValue = hours * 60 + minutes;
    
    const startMorning = 10 * 60;
    const startWarning = 20 * 60 + 30;  // 20:30
    const startWarningWithAddress = 21 * 60;  // 21:00
    const endDelivery = 22 * 60;  // 22:00
    const endNight = 6 * 60;
    
    if (timeValue >= startMorning && timeValue < startWarning) {
        return 'normal';  // Обычный режим
    } else if (timeValue >= startWarning && timeValue < startWarningWithAddress) {
        return 'warning';  // 20:30-21:00 - Доставляем до 22:00
    } else if (timeValue >= startWarningWithAddress && timeValue < endDelivery) {
        return 'warning-address';  // 21:00-22:00 - Доставляем до 22:00 + адрес
    } else if (timeValue >= endDelivery || timeValue < endNight) {
        return 'closed';  // 22:00+ - закрыто, только Яндекс Еда
    } else {
        return 'yandex';
    }
}

function showCart() {
    const modal = document.getElementById('cart-modal');
    const itemsContainer = document.getElementById('cart-items');

    if (cart.length === 0) {
        itemsContainer.innerHTML = `
            <p style="text-align: center; color: #86868b; padding: 40px 0;">Корзина пуста</p>
            <div class="cart-actions">
                <button class="btn btn-secondary" onclick="hideCart()">Закрыть</button>
            </div>
        `;
    } else {
        const itemsHtml = cart.map((item, idx) => `
            <div class="cart-item" style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--border-subtle); flex-wrap:wrap; gap:10px;">
                <div style="flex:1; min-width:180px;">
                    <div style="font-weight: 700; font-size: 15px; margin-bottom: 6px; line-height:1.3;">${item.title}</div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <button type="button" class="quantity-btn-small minus" onclick="changeQuantity(${idx}, -1)">−</button>
                        <span style="font-weight:600; font-size:16px; min-width:24px; text-align:center;">${item.quantity}</span>
                        <button type="button" class="quantity-btn-small" onclick="changeQuantity(${idx}, 1)">+</button>
                        <span style="color: var(--color-text-secondary); font-size: 13px; margin-left:4px;">× ${item.price} ₽</span>
                    </div>
                </div>
                <div style="font-weight: 800; color: var(--color-primary); font-size: 16px; white-space:nowrap;">${item.quantity * item.price} ₽</div>
            </div>
        `).join('');

        const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
        const timeStatus = getTimeStatus();
        
        let timeMessage = '';
        // После 22:00 откроемся "завтра"; после полуночи и до открытия — уже "сегодня".
        const opensWhen = new Date().getHours() >= 22 ? 'завтра' : 'сегодня';
        const howToFindUs = `
            <div style="color: #fff; font-size: 11px; line-height: 1.5; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2);">
                <strong>Как нас найти:</strong><br>
                ТЦ "Перинные ряды", Думская 4<br>
                Вход со стороны Думской, деревянная дверь,<br>
                ближе к ул. Ломоносова, 2 этаж. Pizza Napoli
            </div>
        `;
        
        // Обычное время - показываем адрес
        if (timeStatus === 'normal') {
            timeMessage = `
                <div style="background: linear-gradient(135deg, #2a582c 0%, #1e3d21 100%); padding: 12px; border-radius: 12px; margin-bottom: 16px; text-align: center;">
                    <div style="color: #fff; font-weight: 600; font-size: 13px;"><i class="fas fa-store" style="margin-right:6px;"></i>Ждем вас в гости на Думской 4</div>
                    <div style="color: #c8e6c9; font-size: 11px; margin-top: 4px;">ТЦ Перинные ряды, центральный вход со стороны ул. Ломоносова, 2 этаж</div>
                </div>
            `;
        // 20:30-21:00 - предупреждение о времени
        } else if (timeStatus === 'warning') {
            timeMessage = `
                <div style="background: linear-gradient(135deg, #ff9a3c 0%, #ff6b35 100%); padding: 14px; border-radius: 12px; margin-bottom: 16px; text-align: center;">
                    <div style="color: #fff; font-weight: 700; font-size: 14px;"><i class="fas fa-bicycle" style="margin-right:6px;"></i>Доставляем до 22:00</div>
                    <div style="color: #fff; font-size: 12px; margin-top: 6px;">Успейте оформить заказ!</div>
                </div>
            `;
        // 21:00-22:00 - предупреждение + адрес
        } else if (timeStatus === 'warning-address') {
            timeMessage = `
                <div style="background: linear-gradient(135deg, #ff9a3c 0%, #ff6b35 100%); padding: 14px; border-radius: 12px; margin-bottom: 16px; text-align: center;">
                    <div style="color: #fff; font-weight: 700; font-size: 14px;"><i class="fas fa-bicycle" style="margin-right:6px;"></i>Доставляем до 22:00</div>
                    <div style="color: #fff; font-size: 12px; margin-top: 6px;">Спешите! Заказы принимаются до 22:00</div>
                    ${howToFindUs}
                </div>
            `;
        // 22:00+ - закрыто, только Яндекс Еда
        } else if (timeStatus === 'closed') {
            timeMessage = `
                <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ff2e55 100%); padding: 14px; border-radius: 12px; margin-bottom: 16px; text-align: center;">
                    <div style="color: #fff; font-weight: 700; font-size: 14px;"><i class="fas fa-bicycle" style="margin-right:6px;"></i>Доставка ресторана закрыта</div>
                    <div style="color: #fff; font-size: 12px; margin-top: 6px;">Ждем вас ${opensWhen} с 10:00!</div>
                    ${howToFindUs}
                    <div style="margin-top: 12px;">
                        <a href="https://eda.yandex.ru/r/pizza_napoli_bmroq?placeSlug=pizza_napoli__gr3t5" target="_blank" style="display: inline-block; background: #FFAB00; color: #000; font-weight: 700; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 13px;">
                            <i class="fas fa-pizza-slice" style="margin-right:6px;"></i>Заказать на Яндекс Еде
                        </a>
                    </div>
                </div>
            `;
        // Ночь - закрыто
        } else if (timeStatus === 'yandex') {
            timeMessage = `
                <div style="background: linear-gradient(135deg, #2a582c 0%, #1e3d21 100%); padding: 16px; border-radius: 12px; margin-bottom: 16px; text-align: center;">
                    <div style="color: #fff; font-weight: 700; font-size: 14px;"><i class="fas fa-moon" style="margin-right:6px;"></i>Ресторан закрыт</div>
                    <div style="color: #c8e6c9; font-size: 12px; margin-top: 6px;">Приходите ${opensWhen} с 10:00!</div>
                    ${howToFindUs}
                    <div style="margin-top: 12px;">
                        <a href="https://eda.yandex.ru/r/pizza_napoli_bmroq?placeSlug=pizza_napoli__gr3t5" target="_blank" style="display: inline-block; background: #FFAB00; color: #000; font-weight: 700; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 13px;">
                            <i class="fas fa-pizza-slice" style="margin-right:6px;"></i>Заказать на Яндекс Еде
                        </a>
                    </div>
                </div>
            `;
        }
        
        // Определяем текущий уровень и доступные подарки
        const availableGifts = GIFT_THRESHOLDS.filter(g => total >= g.threshold);
        const nextGift = GIFT_THRESHOLDS.find(g => total < g.threshold);
        const highestGift = availableGifts.length > 0 ? availableGifts[availableGifts.length - 1] : null;
        
        // Генерируем HTML для выбора подарка
        const giftOptionsHtml = availableGifts.slice(1).map((gift, idx) => {
            const isSelected = selectedGift && selectedGift.threshold === gift.threshold;
            return `
                <label style="display: flex; align-items: center; gap: 12px; padding: 12px; background: ${isSelected ? '#e8f5e9' : '#fff'}; border: 2px solid ${isSelected ? '#4caf50' : '#e0e0e0'}; border-radius: 10px; cursor: pointer; transition: all 0.2s; margin-bottom: 8px;">
                    <input type="radio" name="gift" value="${gift.threshold}" ${isSelected ? 'checked' : ''} onchange="selectGift(${gift.threshold})" style="accent-color: #4caf50; width: 20px; height: 20px;">
                    <i class="fas ${gift.icon}" style="color: #ff6b35; font-size: 20px; width: 28px;"></i>
                    <div style="flex: 1;">
                        <span style="font-size: 14px; font-weight: 600; color: #333;">${gift.name}</span>
                    </div>
                    <span style="font-size: 18px; color: #4caf50;">🎁</span>
                </label>
            `;
        }).join('');
        
        itemsContainer.innerHTML = `
            ${timeMessage}
            ${itemsHtml}
            <div class="cart-total-row" style="display:flex; justify-content:space-between; align-items:center; padding:16px 0; border-top:1px solid var(--border-subtle); margin-top:12px;">
                <span style="font-weight:700; font-size:18px;">Итого</span>
                <span style="font-weight:800; font-size:22px; color:#ff2e55;">${total} ₽</span>
            </div>
            
            ${/* Блок доставки */''}
            ${total < 750 ? `
                <div style="background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%); padding: 14px; border-radius: 10px; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                        <span style="font-size: 14px; color: #e65100; font-weight: 600;">
                            <i class="fas fa-truck" style="margin-right: 6px;"></i>Доставка
                        </span>
                        <span style="font-size: 16px; color: #e65100; font-weight: 700;">+${Math.min(250, 750 - total)} ₽</span>
                    </div>
                    
                    ${/* Шкала прогресса */''}
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                        <span style="font-size: 12px; color: #e65100; font-weight: 600;">${total}₽</span>
                        <div style="flex: 1; background: #ffcc80; height: 12px; border-radius: 6px; overflow: hidden; position: relative;">
                            <div style="background: linear-gradient(90deg, #ff6b35, #ff2e55); height: 100%; width: ${Math.min(100, (total / 750) * 100)}%; border-radius: 6px; transition: width 0.3s ease;"></div>
                        </div>
                        <span style="font-size: 12px; color: #e65100; font-weight: 600;">750₽</span>
                    </div>
                    
                    <div style="font-size: 12px; color: #bf360c; text-align: center;">
                        <i class="fas fa-arrow-up" style="margin-right: 4px;"></i>Добавьте ${750 - total} ₽ → доставка бесплатно + первый подарок!
                    </div>
                </div>
            ` : `
                <div style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); padding: 12px; border-radius: 10px; margin-bottom: 12px; text-align: center;">
                    <span style="font-size: 14px; color: #2e7d32; font-weight: 600;">
                        <i class="fas fa-check-circle" style="margin-right: 6px;"></i>Бесплатная доставка ✓
                    </span>
                </div>
            `}
            
            ${/* Блок подарков */''}
            <div style="background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%); padding: 14px; border-radius: 12px; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                    <i class="fas fa-gift" style="color: #ff6b35; font-size: 18px;"></i>
                    <span style="font-size: 14px; color: #e65100; font-weight: 700;">Подарки</span>
                </div>
                
                ${/* Шкала прогресса - мобильная версия */''}
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 4px; overflow-x: auto; padding: 4px 0; -webkit-overflow-scrolling: touch;">
                        ${GIFT_THRESHOLDS.map((gift, idx) => {
                            const isComplete = total >= gift.threshold;
                            const isNext = nextGift && nextGift.threshold === gift.threshold;
                            return `
                                <div style="flex-shrink: 0; text-align: center; min-width: 50px;">
                                    <i class="fas ${isComplete ? 'fa-check-circle' : (isNext ? 'fa-dot-circle' : 'fa-circle')}" style="color: ${isComplete ? '#4caf50' : (isNext ? '#ff6b35' : '#ccc')}; font-size: ${isNext ? '22px' : '16px'};"></i>
                                </div>
                                ${idx < GIFT_THRESHOLDS.length - 1 ? `<div style="flex: 1; min-width: 20px; height: 3px; background: ${total >= gift.threshold && total >= GIFT_THRESHOLDS[idx + 1].threshold ? '#4caf50' : (total >= gift.threshold ? '#ff9a3c' : '#e0e0e0')}; border-radius: 2px; margin: 0 -2px;"></div>` : ''}
                            `;
                        }).join('')}
                    </div>
                    
                    ${/* Текущая цель */''}
                    ${nextGift ? `
                        <div style="text-align: center; margin-top: 8px;">
                            <span style="font-size: 13px; color: #e65100;">
                                <i class="fas fa-bullseye" style="margin-right: 4px;"></i>
                                До подарка <strong>${nextGift.name}</strong> — ${nextGift.threshold - total}₽
                            </span>
                        </div>
                    ` : `
                        <div style="text-align: center; margin-top: 8px;">
                            <span style="font-size: 13px; color: #4caf50; font-weight: 600;">
                                <i class="fas fa-star" style="margin-right: 4px;"></i>
                                Все подарки доступны!
                            </span>
                        </div>
                    `}
                </div>
                
                ${/* Текущий статус */''}
                ${highestGift ? `
                    <div style="background: #4caf50; color: white; padding: 8px 12px; border-radius: 8px; margin-bottom: 10px; text-align: center;">
                        <i class="fas fa-check-circle" style="margin-right: 4px;"></i>
                        ${availableGifts.length > 1 ? 'Бесплатная доставка + Выберите подарок!' : 'Бесплатная доставка!'}
                    </div>
                    
                    ${giftOptionsHtml ? `
                        <div style="margin-bottom: 8px;">
                            <div style="font-size: 12px; color: #666; margin-bottom: 6px; font-weight: 600;">Выберите один подарок:</div>
                            <div style="display: flex; flex-direction: column; gap: 6px;">
                                ${giftOptionsHtml}
                            </div>
                            <div style="text-align: center; margin-top: 8px;">
                                <span onclick="clearGiftSelection()" style="font-size: 12px; color: #999; cursor: pointer; text-decoration: underline;">
                                    <i class="fas fa-times" style="margin-right: 4px;"></i>Без подарка
                                </span>
                            </div>
                        </div>
                    ` : ''}
                ` : ''}
            </div>
            
            <form class="order-form" onsubmit="event.preventDefault(); submitOrder();" style="display:flex; flex-direction:column; gap:10px; margin-top:8px;">
                <label style="display:flex; flex-direction:column; gap:4px; font-weight:600; font-size:14px;">
                    Откуда заказ
                    <select id="order-source" onchange="toggleCustomSource(this.value)" style="padding:10px; border:1px solid var(--border-strong); border-radius:8px; background:var(--color-bg-card); color:var(--color-text-primary); font-size:15px;">
                        <option value="12rooms">12 комнат</option>
                        <option value="MGarryPotter">Музей Гарри Поттера</option>
                        <option value="SVO">Музей СВО</option>
                        <option value="Lomonosov">Отель Ломоносов</option>
                        <option value="PartyTime">Караоке Party Time</option>
                        <option value="MusicSchool">Музыкальная Школа</option>
                        <option value="SuperSonic">Супер Соник</option>
                        <option value="custom">Другое</option>
                    </select>
                </label>
                <div id="custom-source-container" style="display:none; margin-top:8px;">
                    <input type="text" id="order-source-custom" placeholder="Введите название места" style="padding:10px; border:1px solid var(--border-strong); border-radius:8px; background:var(--color-bg-card); color:var(--color-text-primary); font-size:15px; width:100%; box-sizing:border-box;">
                </div>
                <label style="display:flex; flex-direction:column; gap:4px; font-weight:600; font-size:14px;">
                    Номер столика или удобное для вас место где вас найти
                    <input type="text" id="order-table-number" required maxlength="10" placeholder="Например, 5" style="padding:10px; border:1px solid var(--border-strong); border-radius:8px; background:var(--color-bg-card); color:var(--color-text-primary); font-size:15px;">
                </label>
                <label style="display:flex; flex-direction:column; gap:4px; font-weight:600; font-size:14px;">
                    Номер телефона
                    <input type="tel" id="order-phone" required maxlength="20" placeholder="+7 (999) 123-45-67" style="padding:10px; border:1px solid var(--border-strong); border-radius:8px; background:var(--color-bg-card); color:var(--color-text-primary); font-size:15px;">
                </label>
                <label style="display:flex; flex-direction:column; gap:4px; font-weight:600; font-size:14px;">
                    Комментарий (необязательно)
                    <textarea id="order-comment" rows="2" maxlength="500" placeholder="Пожелания, аллергии" style="padding:10px; border:1px solid var(--border-strong); border-radius:8px; background:var(--color-bg-card); color:var(--color-text-primary); font-size:14px; resize:vertical; font-family:inherit;"></textarea>
                </label>
                <div class="cart-actions">
                    <button type="button" class="btn btn-secondary" onclick="hideCart()">Закрыть</button>
                    <button type="submit" id="order-submit-btn" class="btn btn-primary">Оформить заказ</button>
                </div>
                <div style="background: linear-gradient(135deg, #2a582c 0%, #1e3d21 100%); padding:12px; border-radius:10px; margin-top:4px; margin-bottom:200px;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                        <i class="fas fa-motorcycle" style="font-size:20px; color:#fff;"></i>
                        <span style="color:#fff; font-weight:700; font-size:14px;">Доставка курьером</span>
                    </div>
                    <div style="color:#c8e6c9; font-size:12px; line-height:1.4;">
                        К вам приедет курьер из Pizza Napoli<br>
                        <i class="fas fa-print" style="margin-right:4px;"></i><strong>С терминалом</strong> <i class="fas fa-credit-card" style="margin-left:8px; margin-right:4px;"></i>для оплаты Картой или QR и выдаст чек
                    </div>
                    <div style="color:#c8e6c9; font-size:11px; margin-top:10px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.2);">
                        <i class="fas fa-store" style="margin-right:4px;"></i>Ждем вас в гости на Думской 4<br>ТЦ Перинные ряды, центральный вход со стороны ул. Ломоносова, 2 этаж
                    </div>
                </div>
                <div style="text-align:center; padding: 20px 0; color: var(--color-text-secondary); font-size: 14px;">
                    <div style="font-weight: 700; margin-bottom: 4px;">Приятного аппетита!</div>
                    <div>Сеть итальянских пиццерий</div>
                    <div style="font-weight: 700; margin-top: 8px;">Pizza Napoli</div>
                </div>
            </form>
        `;
    }

    modal.style.display = 'flex';
    
    const urlParams = new URLSearchParams(window.location.search);
    const sourceParam = urlParams.get('source');
    const sourceSelect = document.getElementById('order-source');
    if (sourceSelect && sourceParam) {
        const sources = window.ORDER_SOURCES || {};
        if (sources[sourceParam]) {
            sourceSelect.value = sourceParam;
        }
    }
}

function hideCart() {
    document.getElementById('cart-modal').style.display = 'none';
}

function changeQuantity(index, delta) {
    if (cart[index]) {
        cart[index].quantity += delta;
        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }
        saveCart();
        updateCartTotal();
        showCart();
    }
}

function selectGift(threshold) {
    selectedGift = GIFT_THRESHOLDS.find(g => g.threshold === threshold);
    // Обновляем UI без перерисовки всей корзины
    const radios = document.querySelectorAll('input[name="gift"]');
    radios.forEach(radio => {
        const label = radio.closest('label');
        if (parseInt(radio.value) === threshold) {
            label.style.background = '#e8f5e9';
            label.style.borderColor = '#4caf50';
            radio.checked = true;
        } else {
            label.style.background = 'transparent';
            label.style.borderColor = '#e0e0e0';
        }
    });
}

function clearGiftSelection() {
    selectedGift = null;
    const radios = document.querySelectorAll('input[name="gift"]');
    radios.forEach(radio => {
        const label = radio.closest('label');
        label.style.background = 'transparent';
        label.style.borderColor = '#e0e0e0';
        radio.checked = false;
    });
}

function showThankYou() {
    const modal = document.getElementById('cart-modal');
    modal.innerHTML = `
        <div class="modal-content" style="max-width:420px; text-align:center; padding:40px 30px;">
            <div style="font-size:64px; margin-bottom:16px;"><i class="fas fa-check-circle" style="color:#27ae60;"></i></div>
            <h2 style="margin:0 0 20px; font-size:26px; color:var(--color-text-primary);">Спасибо за заказ!</h2>
            <div style="background: linear-gradient(135deg, #2a582c 0%, #1e3d21 100%); padding:20px; border-radius:12px; margin-bottom:20px;">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                    <i class="fas fa-motorcycle" style="font-size:24px; color:#fff;"></i>
                    <span style="color:#fff; font-weight:700; font-size:16px;">Доставка курьером</span>
                </div>
                <div style="color:#c8e6c9; font-size:14px; line-height:1.6; text-align:left;">
                    К вам приедет курьер из ресторана Pizza Napoli<br><br>
                    <i class="fas fa-print"></i> <strong>С собой терминал</strong><br>
                    <i class="fas fa-credit-card"></i> Оплата картой или по QR-коду
                </div>
            </div>
            <p style="color:var(--color-text-secondary); font-size:15px; margin:0 0 24px;">Мы свяжемся с вами для подтверждения</p>
            <button class="btn btn-primary" onclick="closeThankYou()" style="width:100%;">Понятно</button>
        </div>
    `;
    modal.style.display = 'flex';
}

function closeThankYou() {
    const modal = document.getElementById('cart-modal');
    modal.style.display = 'none';
    // showThankYou() перезаписал innerHTML модалки — восстанавливаем разметку из index.html,
    // иначе следующий showCart() не найдёт #cart-items.
    modal.innerHTML = `
        <div class="cart-modal">
            <h2><i class="fas fa-shopping-basket" style="margin-right:8px; color:#fff;"></i>Ваша корзина</h2>
            <div id="cart-items"></div>
        </div>
    `;
}

// ========================================
// MAX TRANSPORT (Yandex Cloud Function)
// ========================================
// Backend = тонкий транспорт. Любое форматирование делаем тут.

async function sendToMax(text, format = 'html') {
    const maxEndpoint = window.ORDER_CONFIG?.maxEndpoint;
    if (!maxEndpoint) {
        console.error('Max endpoint not configured');
        return;
    }
    try {
        const response = await fetch(maxEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, format })
        });
        const body = await response.text();
        if (!response.ok) {
            console.error('Max transport error:', response.status, body);
        } else {
            console.log('Sent to Max successfully');
        }
    } catch (err) {
        console.error('Max sending failed:', err);
    }
}

function formatOrderHTML(order) {
    const lines = ['<b>🍕 ЗАКАЗ Pizza Napoli!</b>', ''];

    lines.push(`📍 Источник: ${order.source || '-'}`);
    lines.push(`🪑 Место: ${order.tableNumber}`);
    lines.push(`📱 Телефон: ${order.phone}`);
    if (order.comment) {
        lines.push(`💬 Комментарий: ${order.comment}`);
    }

    lines.push('', '<b>🛒 Состав:</b>');
    let total = 0;
    for (const item of order.items) {
        const subtotal = item.price * item.quantity;
        const priceLine = item.price === 0 ? '🎁' : `<b>${subtotal} ₽</b>`;
        lines.push(`• <b>${item.quantity}</b> × ${item.title}`);
        lines.push(`  └─ ${priceLine}`);
        total += subtotal;
    }

    let footer = `\n💰 Итого: <b>${total} ₽</b>`;
    if (order.gift) footer += `\n🎁 Подарок: ${order.gift}`;

    return lines.join('\n') + footer;
}

function toggleCustomSource(value) {
    const customContainer = document.getElementById('custom-source-container');
    if (customContainer) {
        customContainer.style.display = value === 'custom' ? 'block' : 'none';
    }
}

async function submitOrder() {
    const timeStatus = getTimeStatus();
    const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    
    // После 22:00 - не даем оформить заказ, предлагаем Яндекс Еду
    if (timeStatus === 'closed' || timeStatus === 'yandex') {
        if (confirm('Доставка ресторана закрыта. Заказать на Яндекс Еде?')) {
            window.open('https://eda.yandex.ru/r/pizza_napoli_bmroq?placeSlug=pizza_napoli__gr3t5', '_blank');
        }
        return;
    }
    
    const tableInput = document.getElementById('order-table-number');
    const phoneInput = document.getElementById('order-phone');
    const commentInput = document.getElementById('order-comment');
    const btn = document.getElementById('order-submit-btn');

    const tableNumber = (tableInput?.value || '').trim();
    const phone = (phoneInput?.value || '').trim();
    const comment = (commentInput?.value || '').trim();

    if (!tableNumber) {
        tableInput?.focus();
        alert('Укажите номер столика');
        return;
    }

    if (!phone) {
        phoneInput?.focus();
        alert('Укажите номер телефона');
        return;
    }

    if (cart.length === 0) {
        alert('Корзина пуста');
        return;
    }

    const originalLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Отправляем...';

    const sourceSelect = document.getElementById('order-source');
    const customSourceInput = document.getElementById('order-source-custom');
    
    const selectedSourceKey = sourceSelect?.value || '12rooms';
    const customSourceValue = customSourceInput?.value?.trim() || '';
    
    let sourceKey = selectedSourceKey;
    let source = '';
    const sources = window.ORDER_SOURCES || locations;
    
    if (selectedSourceKey === 'custom') {
        sourceKey = 'custom';
        source = customSourceValue || 'Другое — место не указано';
    } else {
        source = sources[selectedSourceKey] || '12 комнат';
    }

    // Формируем массив товаров, добавляя подарок и доставку если нужно
    let orderItems = cart.map(i => ({
        title: i.title,
        price: i.price,
        quantity: i.quantity,
        category: i.category
    }));
    
    // Добавляем доставку если менее 750
    const deliveryFee = cartTotal < 750 ? Math.min(250, 750 - cartTotal) : 0;
    if (deliveryFee > 0) {
        orderItems.push({
            title: 'Доставка',
            price: deliveryFee,
            quantity: 1,
            category: 'delivery'
        });
    }
    
    // Подарок попадает в сообщение только в footer (см. formatOrderHTML).
    // threshold === 750 = бесплатная доставка (не реальный подарок) — игнорим.
    const giftLine = (selectedGift && selectedGift.threshold > 750)
        ? `${selectedGift.name} (за заказ от ${selectedGift.threshold}₽)`
        : null;

    console.log('Submitting order:', { tableNumber, source, cartTotal, deliveryFee, itemCount: orderItems.length, gift: giftLine });
    try {
        const message = formatOrderHTML({
            tableNumber,
            phone,
            comment,
            source,
            gift: giftLine,
            items: orderItems
        });
        await sendToMax(message, 'html');
        
        clearCart();
        hideCart();
        showThankYou();
    } catch (err) {
        console.error('Order submission failed:', err);
        alert(`Не удалось отправить заказ: ${err.message}`);
        btn.disabled = false;
        btn.textContent = originalLabel;
    }
}

document.getElementById('cart-modal')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        hideCart();
    }
});

// Mobile Menu Functions
function initMobileMenu() {
    const mobileMenuContent = document.getElementById('mobile-menu-content');
    const categories = getUniqueCategories();
    
    // Рендерим мобильное меню
    let html = '';
    MENU_GROUPS.forEach(group => {
        // Добавляем заголовок группы
        html += `<div class="mobile-group-title">${group.title}</div>`;
        
        // Добавляем категории группы
        group.categories.forEach(cat => {
            // Информационные разделы показываем всегда
            if (cat === 'contacts' || cat === 'legal' || cat === 'masterclass' || cat === 'franchise' || categories.includes(cat)) {
                const count = (cat === 'legal' || cat === 'masterclass' || cat === 'franchise') ? 0 : (cat === 'contacts' ? 2 : menu.filter(item => item.category === cat).length);
                const displayName = CATEGORY_MAP[cat] || cat;
                
                html += `
                    <div class="mobile-nav-category" data-category="${cat}" onclick="selectMobileCategory('${cat}')">
                        <span>${displayName}</span>
                        ${count > 0 ? `<span class="mobile-nav-count">${count}</span>` : ''}
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
    
    // Собираем все категории в правильном порядке
    const orderedCategories = [];
    MENU_GROUPS.forEach(group => {
        group.categories.forEach(cat => {
            if (cat === 'contacts' || cat === 'legal' || cat === 'masterclass' || cat === 'franchise' || menu.some(item => item.category === cat)) {
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
        
        const displayName = (window.CATEGORY_MAP || {})[cat] || cat;
        const isActive = index < 3 ? '' : 'display: none;';
        
        // Для контактов - специальный рендеринг (лента карточек)
        if (cat === 'contacts') {
            return `
                <div class="category-section" id="category-${cat}" style="${isActive}">
                    <div class="category-header">
                        <h2 class="category-title"><i class="fas fa-map-marker-alt" style="margin-right:8px; color:#fff;"></i>Контакты</h2>
                        <p class="category-subtitle">Наши пиццерии и способы связи</p>
                    </div>
                    <div class="products-grid" id="grid-${cat}" data-loaded="0">
                        ${renderContactsLazy()}
                    </div>
                </div>
            `;
        }
        
        // Для мастер класса - информационная секция
        if (cat === 'masterclass') {
            return `
                <div class="category-section" id="category-${cat}" style="${isActive}">
                    <div class="category-header">
                        <h2 class="category-title"><i class="fas fa-graduation-cap" style="margin-right:8px; color:#fff;"></i>Мастер класс</h2>
                        <p class="category-subtitle">Обучение и мастер-классы</p>
                    </div>
                    <div style="padding: 20px; max-width: 800px; margin: 0 auto;">
                        <div style="background: var(--color-bg-card); padding: 30px; border-radius: 16px; border: 1px solid var(--border-subtle);">
                            <h3 style="font-size: 22px; margin: 0 0 16px; color: var(--color-text-heading);">🎓 Мастер-классы по приготовлению пиццы</h3>
                            <p style="font-size: 15px; color: var(--color-text-secondary); line-height: 1.6; margin-bottom: 16px;">
                                Приглашаем вас на увлекательные мастер-классы по приготовлению настоящей неаполитанской пиццы от нашего шеф-повара!
                            </p>
                            <ul style="font-size: 14px; color: var(--color-text-secondary); line-height: 1.8; padding-left: 20px;">
                                <li>🍕 Техника приготовления теста для пиццы</li>
                                <li>🧀 Подбор и сочетание ингредиентов</li>
                                <li>🔥 Работа с дровяной печью</li>
                                <li>👨‍🍳 Индивидуальный подход к каждому участнику</li>
                            </ul>
                            <p style="font-size: 14px; color: var(--color-text-secondary); margin-top: 20px; padding: 16px; background: var(--color-primary-light); border-radius: 8px;">
                                <i class="fas fa-phone-alt" style="margin-right: 8px;"></i> Для записи на мастер-класс звоните: <strong>+7 (999) 169-98-39</strong>
                            </p>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Для франшизы - информационная секция
        if (cat === 'franchise') {
            return `
                <div class="category-section" id="category-${cat}" style="${isActive}">
                    <div class="category-header">
                        <h2 class="category-title"><i class="fas fa-handshake" style="margin-right:8px; color:#fff;"></i>Франшиза</h2>
                        <p class="category-subtitle">Откройте свою пиццерию</p>
                    </div>
                    <div style="padding: 20px; max-width: 800px; margin: 0 auto;">
                        <div style="background: var(--color-bg-card); padding: 30px; border-radius: 16px; border: 1px solid var(--border-subtle);">
                            <h3 style="font-size: 22px; margin: 0 0 16px; color: var(--color-text-heading);">🏪 Франшиза Pizza Napoli</h3>
                            <p style="font-size: 15px; color: var(--color-text-secondary); line-height: 1.6; margin-bottom: 16px;">
                                Откройте успешную пиццерию под брендом Pizza Napoli и станьте частью растущей сети!
                            </p>
                            <ul style="font-size: 14px; color: var(--color-text-secondary); line-height: 1.8; padding-left: 20px;">
                                <li>📋 Полное сопровождение и поддержка</li>
                                <li>🍕 Уникальные рецепты и технологии</li>
                                <li>👨‍🍳 Обучение персонала и шеф-поваров</li>
                                <li>📦 Закупка ингредиентов и оборудования</li>
                                <li>📱 Маркетинговая поддержка</li>
                            </ul>
                            <p style="font-size: 14px; color: var(--color-text-secondary); margin-top: 20px; padding: 16px; background: var(--color-primary-light); border-radius: 8px;">
                                <i class="fas fa-phone-alt" style="margin-right: 8px;"></i> Для получения информации о франшизе звоните: <strong>+7 (999) 169-98-39</strong>
                            </p>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Для юридической информации - специальный рендеринг
        if (cat === 'legal') {
            return `
                <div class="category-section" id="category-${cat}" style="${isActive}">
                    <div class="category-header">
                        <h2 class="category-title"><i class="fas fa-file-alt" style="margin-right:8px; color:#fff;"></i>Юридическая информация</h2>
                        <p class="category-subtitle">Реквизиты для оплаты</p>
                    </div>
                    <div style="padding: 20px; max-width: 800px; margin: 0 auto;">
                        <h3 style="font-size: 18px; margin: 0 0 16px; color: #1a1a1a;">Наша компания</h3>
                        <div style="background: #f8f9fa; padding: 24px; border-radius: 16px; margin-bottom: 24px;">
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                                <div>
                                    <div style="font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 6px;">Полное наименование</div>
                                    <div style="font-size: 16px; font-weight: 600; color: #1a1a1a;">ООО "АТМОСФЕРА"</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 6px;">ИНН</div>
                                    <div style="font-size: 16px; font-weight: 600; color: #1a1a1a;">7842216839</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 6px;">ОГРН</div>
                                    <div style="font-size: 16px; font-weight: 600; color: #1a1a1a;">1237800084158</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 6px;">Телефон</div>
                                    <div style="font-size: 16px; font-weight: 600; color: #1a1a1a;">+7 (993) 978-60-13</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 6px;">Email</div>
                                    <div style="font-size: 16px; font-weight: 600; color: #1a1a1a;">pizzanapolirsc2@gmail.com</div>
                                </div>
                            </div>
                        </div>
                        <h3 style="font-size: 18px; margin: 0 0 16px; color: #1a1a1a;">Франшиза Pizza Napoli</h3>
                        <div style="background: #f0f7f0; padding: 24px; border-radius: 16px; border: 2px solid #2a582c;">
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                                <div>
                                    <div style="font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 6px;">Франшиза</div>
                                    <div style="font-size: 16px; font-weight: 600; color: #1a1a1a;">Pizza Napoli от Родионов Групп</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 6px;">Владелец бренда</div>
                                    <div style="font-size: 16px; font-weight: 600; color: #1a1a1a;">ООО "РОДИОНОВ ГРУПП"</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 6px;">Основатель</div>
                                    <div style="font-size: 16px; font-weight: 600; color: #1a1a1a;">Родионов Виталий Викторович</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 6px;">Телефон</div>
                                    <div style="font-size: 16px; font-weight: 600; color: #1a1a1a;">+7 (999) 169-98-39</div>
                                </div>
                            </div>
                        </div>
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
    
    // Подсчитываем сколько групп уже показано
    const visibleCategories = orderedCategories.length;
    const categoriesInFirstGroups = 3; // Только Пицца (3 категории: 30см, 20см, Кальцоне)
    
    // Если есть ещё категории — добавляем кнопку "Показать ещё"
    if (visibleCategories > categoriesInFirstGroups) {
        content.innerHTML += `
            <div id="load-more-groups" style="text-align:center; padding: 40px 20px;">
                <button onclick="loadMoreCategoryGroups()" style="padding: 14px 48px; background: linear-gradient(135deg, #ff2e55 0%, #ff6b6b 100%); color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(255,46,85,0.3);">
                    <i class="fas fa-arrow-down" style="margin-right:8px;"></i>Показать ещё категории
                </button>
                <p style="color:#86868b; margin-top:12px; font-size:14px;">Показано ${categoriesInFirstGroups} из ${visibleCategories} категорий</p>
            </div>
        `;
    }
    
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
        // Первые 4 карточки above-the-fold → eager + high priority (LCP).
        const loadingAttrs = idx < 4
            ? 'loading="eager" fetchpriority="high" decoding="async"'
            : 'loading="lazy" decoding="async"';
        const imageHtml = `<img src="${product.image}" alt="${product.title}" class="product-image" ${loadingAttrs} onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 260 200%22><rect fill=%22%23f5f5f7%22 width=%22260%22 height=%22200%22/><text x=%22130%22 y=%22105%22 text-anchor=%22middle%22 fill=%22%2386868b%22 font-size=%2214%22>No Photo</text></svg>'">`;
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
            title: 'Pizza Napoli',
            subtitle: 'Основная пиццерия',
            image: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 260 200%22><rect fill=%22%23ff2e55%22 width=%22260%22 height=%22200%22/><path d=%22M130 30 L200 160 L60 160 Z%22 fill=%22%23f5d088%22 stroke=%22%23e8a830%22 stroke-width=%223%22/><circle cx=%22130%22 cy=%22100%22 r=%2212%22 fill=%22%23e74c3c%22/><circle cx=%22100%22 cy=%22130%22 r=%2210%22 fill=%22%232ecc71%22/><circle cx=%22160%22 cy=%22125%22 r=%2211%22 fill=%22%23e74c3c%22/><circle cx=%22140%22 cy=%22140%22 r=%228%22 fill=%22%23f5d088%22/><text x=%22130%22 y=%22180%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2214%22 font-family=%22Arial%22>Pizza Napoli</text></svg>',
            description: 'ул. Думская 4, Центральный район',
            phone: '+7 (993) 978-60-13',
            hours: 'с 10:00 до 22:00 без выходных',
            payment: 'Наличными • Картой • Переводом • Безналичным платежом',
            badge: null
        },
        {
            id: 'contact-2',
            title: 'Pizza Napoli',
            subtitle: 'Вторая локация',
            image: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 260 200%22><rect fill=%22%23ff6b6b%22 width=%22260%22 height=%22200%22/><path d=%22M130 30 L200 160 L60 160 Z%22 fill=%22%23f5d088%22 stroke=%22%23e8a830%22 stroke-width=%223%22/><circle cx=%22130%22 cy=%22100%22 r=%2212%22 fill=%22%23e74c3c%22/><circle cx=%22100%22 cy=%22130%22 r=%2210%22 fill=%22%232ecc71%22/><circle cx=%22160%22 cy=%22125%22 r=%2211%22 fill=%22%23e74c3c%22/><circle cx=%22140%22 cy=%22140%22 r=%228%22 fill=%22%23f5d088%22/><text x=%22130%22 y=%22180%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2214%22 font-family=%22Arial%22>Pizza Napoli</text></svg>',
            description: 'ул. Бабушкина 53, стр. 1, Невский район',
            phone: '+7 (999) 169-98-39',
            hours: 'с 10:00 до 22:00 без выходных',
            payment: 'Наличными • Картой • Переводом • Безналичным платежом',
            badge: null
        }
    ];
    
    return contacts.map((contact, idx) => `
        <div class="product-card contact-card-lazy" style="opacity: 0; transform: translateY(20px); animation: fadeInUp 0.5s ease forwards; animation-delay: ${idx * 0.1}s;">
            <div class="product-image-wrapper" style="height: 160px; position: relative;">
                <img src="${contact.image}" alt="${contact.title}" class="product-image" loading="lazy" decoding="async">
                ${contact.badge ? `<div class="opening-badge" style="position: absolute; top: 10px; right: 10px;">${contact.badge}</div>` : ''}
            </div>
            <div class="product-info">
                <h3 class="product-name" style="font-size: 18px; margin-bottom: 4px;">${contact.title}</h3>
                <p style="color: #86868b; font-size: 13px; margin-bottom: 12px;">${contact.subtitle}</p>
                <p style="margin-bottom: 12px; line-height: 1.5;">${contact.description}</p>
                ${contact.phone ? `
                    <div style="margin-bottom: 8px;">
                        <i class="fas fa-phone-alt" style="color: #ff2e55; margin-right:4px;"></i>
                        <a href="tel:${contact.phone.replace(/\s/g, '')}" style="color: inherit; text-decoration: none; font-weight: 600;">${contact.phone}</a>
                    </div>
                ` : ''}
                ${contact.hours ? `
                    <div style="margin-bottom: 8px;">
                        <i class="fas fa-clock" style="color: #ff2e55; margin-right:4px;"></i>
                        <span>${contact.hours}</span>
                    </div>
                ` : ''}
                ${contact.payment ? `
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.1); font-size: 12px; color: #86868b; line-height: 1.6;">
                        <i class="fas fa-credit-card" style="color: #ff2e55; margin-right:4px;"></i>Оплата: ${contact.payment}
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

function loadMoreCategoryGroups() {
    const loadMoreBtn = document.getElementById('load-more-groups');
    if (loadMoreBtn) {
        loadMoreBtn.remove();
    }
    
    // Показываем все скрытые категории
    document.querySelectorAll('.category-section').forEach(section => {
        section.style.display = '';
    });
    
    // Перезапускаем observer для отслеживания видимых категорий
    setTimeout(() => {
        setupIntersectionObserver();
    }, 100);
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
                <img src="${product.image}" alt="${product.title}" class="product-image" loading="lazy" decoding="async" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 260 200%22><rect fill=%22%23f5f5f7%22 width=%22260%22 height=%22200%22/><text x=%22130%22 y=%22105%22 text-anchor=%22middle%22 fill=%22%2386868b%22 font-size=%2214%22>No Photo</text></svg>'">
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
    const orderedCategories = [];
    const uniqueCategories = getUniqueCategories();
    
    MENU_GROUPS.forEach(group => {
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
                <img src="${product.image}" alt="${product.title}" class="product-modal-image-top-img" decoding="async">
                <button onclick="closeProductModal()" class="product-modal-close-btn" aria-label="Закрыть"><i class="fas fa-times"></i></button>
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

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, starting menu load...');
    if (typeof loadMenu === 'function') {
        loadMenu().catch(function(err) {
            console.error('Menu load error:', err);
            document.getElementById('content').innerHTML = '<div style="padding:20px;text-align:center;color:#666;">Не удалось загрузить меню. Попробуйте обновить страницу.</div>';
        });
    } else {
        console.error('loadMenu function not found');
    }
});

