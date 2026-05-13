// ========================================
// ORDER ENDPOINT CONFIGURATION
// ========================================

window.ORDER_CONFIG = {
    endpoint: 'https://muz.re/pizza-order.php',
    maxEndpoint: 'https://cold-smoke-bf4a.bestdeejay.workers.dev/send'
};

window.MAX_CONFIG = {
    token: 'REDACTED_MAX_TOKEN',
    chat_id: '-73303602691580'
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
