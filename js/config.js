// ========================================
// ORDER ENDPOINT CONFIGURATION
// ========================================
//
// Заказы шлются на серверный прокси, который пересылает их
// в Telegram-канал. Токен бота и chat_id хранятся ТАМ, а не здесь.
// Исходник прокси — pizza-order.php в корне репозитория.
// ========================================

window.ORDER_CONFIG = {
    endpoint: 'https://muz.re/pizza-order.php'
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
