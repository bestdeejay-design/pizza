// ========================================
// ORDER ENDPOINT CONFIGURATION
// ========================================

window.ORDER_CONFIG = {
    // Yandex Cloud Function (см. backend/). Ротация: ./backend/deploy.sh.
    maxEndpoint: 'https://functions.yandexcloud.net/d4ej5aejuk3upbv6u85n'
};

// ========================================
// ORDER SOURCES (Locations)
// ========================================

window.ORDER_SOURCES = {
    '12rooms': '12 комнат',
    'MGarryPotter': 'Музей Гарри Поттера',
    'SVO': 'Музей СВО',
    'Lomonosov': 'Отель Ломоносов',
    'PartyTime': 'Караоке Party Time',
    'MusicSchool': 'Музыкальная Школа',
    'SuperSonic': 'Супер Соник'
};

// ========================================
// CATEGORY GROUPS (for lazy loading)
// ========================================

window.CATEGORY_GROUPS = [
    { title: '<i class="fas fa-pizza-slice" style="color:#fff;"></i> ПИЦЦА', categories: ['pizza-30cm', 'piccolo-20cm', 'calzone'] },
    { title: '<i class="fas fa-fish" style="color:#fff;"></i> СУШИ & РОЛЛЫ', categories: ['rolls-sushi', 'rolls-rolls'] },
    { title: '<i class="fas fa-bread-slice" style="color:#fff;"></i> ХЛЕБ И ФОКАЧЧА', categories: ['bread-focaccia-bread', 'bread-focaccia-focaccia'] },
    { title: '<i class="fas fa-box" style="color:#fff;"></i> НАБОРЫ', categories: ['combo'] },
    { title: '<i class="fas fa-birthday-cake" style="color:#fff;"></i> ДЕСЕРТЫ', categories: ['confectionery'] },
    { title: '<i class="fas fa-glass-cheers" style="color:#fff;"></i> НАПИТКИ', categories: ['mors', 'juice', 'water', 'soda', 'beverages-other'] },
    { title: '<i class="fas fa-chef-hat" style="color:#fff;"></i> ГОТОВИМ ДОМА', categories: ['frozen', 'aromatic-oils'] },
    { title: '<i class="fas fa-info-circle" style="color:#fff;"></i> ИНФОРМАЦИЯ', categories: ['masterclass', 'franchise', 'contacts', 'legal'] }
];

// ========================================
// CATEGORY NAMES MAP (Russian names)
// ========================================

window.CATEGORY_MAP = {
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
    'contacts': 'Контакты',
    'legal': 'Юридическая информация'
};

// ========================================
// LAZY LOAD CONFIG
// ========================================

window.LAZY_LOAD_CONFIG = {
    PRODUCTS_PER_LOAD: 12,
    SCROLL_THRESHOLD: 50,
    DELAY_BEFORE_NAVIGATE: 1500,
    INITIAL_CATEGORIES: 3
};

// ========================================
// GLOBAL SORT CONFIG
// ========================================

window.SORT_MODES = [
    { id: 'recommended', label: 'Рекомендуем', icon: 'fa-star' },
    { id: 'cheap', label: 'Цена по возрастанию', icon: 'fa-arrow-up' },
    { id: 'expensive', label: 'Цена по убыванию', icon: 'fa-arrow-down' }
];

window.HIT_IDS = [
    // Пицца 30 см
    9, 10, 11, 18, 21, 25, 29, 37, 41, 44,
    // Pizza Piccolo 20 см
    50, 51, 56, 80, 84,
    // Кальцоне
    89, 91, 101, 103, 119, 139, 149, 153,
    // Хлеб и Фокачча
    158, 162, 200, 201,
    // Суши и Роллы
    213, 218, 237, 247, 248, 250, 252, 253, 254, 256, 257, 262, 264,
    // Комбо-наборы
    309, 310, 313, 315, 318, 319, 320, 322, 333,
    // Десерты
    268, 269,
    // Напитки — авторские
    271, 275, 276, 278,
    // Заморозка
    283, 284, 285,
    // Ароматные масла
    294, 297
];

// ========================================
// HOME DELIVERY MODE (source=home)
// ========================================

window.HOME_CONFIG = {
    deliveryThreshold: 1500,
    deliveryFee: 199,
    hidePatterns: ['1/4'],   // подстроки в title для скрытия
    paymentMethods: [
        { id: 'card', label: '💳 Картой курьеру' },
        { id: 'qr', label: '📱 QR-код (СБП)' },
        { id: 'cash', label: '💰 Наличные (без сдачи)' }
    ]
};
