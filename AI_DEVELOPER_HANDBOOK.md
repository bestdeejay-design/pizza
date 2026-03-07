# 📘 AI Developer Handbook - Pizza Napoli Delivery

**Версия:** 2.0  
**Последнее обновление:** 2026-03-07  
**Статус:** ✅ Production Ready

---

## 🎯 Назначение

Этот документ описывает **архитектуру и логику работы** проекта Pizza Napoli для ИИ-ассистентов и новых разработчиков. 

**Цель:** Избежать дублирования кода, костылей и неправильных решений при редактировании.

---

## 📁 Структура Проекта

```
pizza/
├── index.html                      # Главная страница (десктоп + мобильный)
├── catalog-delivery.html           # Версия с темной темой
├── catalog-delivery-dark.html      # Альтернативная версия
├── menu-final.json                 # ✅ КАНОНИЧЕСКИЕ ДАННЫЕ МЕНЮ
├── README.md                       # Краткая инструкция
├── AUDIT_REPORT.md                 # Полный аудит кода
│
├── js/
│   └── app-delivery.js             # ✅ ГЛАВНЫЙ JS ФАЙЛ (вся логика)
│
├── css/
│   ├── style.css                   # Основные стили
│   └── style-new.css               # Альтернативные стили
│
├── img/                            # Изображения (255 файлов)
│
└── archive/                        # Вспомогательные файлы (не использовать!)
```

---

## 🔑 КРИТИЧЕСКИ ВАЖНЫЕ ФАЙЛЫ

### ✅ МОЖНО РЕДАКТИРОВАТЬ:
1. **`js/app-delivery.js`** - Основная логика приложения
2. **`index.html`** - Разметка главной страницы
3. **`menu-final.json`** - Данные меню (только через скрипты!)
4. **`css/style.css`** - Стили

### ⚠️ НЕЛЬЗЯ ТРОГАТЬ:
1. **`archive/*`** - Архив старых версий (для истории)
2. **`AUDIT_REPORT.md`** - Отчет аудита (справочник)
3. **`fix-duplicate-ids.js`** - Скрипт исправления (уже выполнен)

---

## 🧠 Архитектура Приложения

### Принцип Работы

```
1. Загрузка страницы (DOMContentLoaded)
   ↓
2. loadMenu() → fetch('menu-final.json')
   ↓
3. Валидация данных → flatten в массив menu[]
   ↓
4. Инициализация UI:
   - initSidebar() → левое меню
   - initMobileMenu() → мобильное меню
   - renderContentWithLazyLoad() → основной контент
   ↓
5. setupSearch() → поиск товаров
   ↓
6. restoreState() → восстановление позиции
```

---

## 📦 Глобальные Константы

**Расположение:** `js/app-delivery.js` (строки 1-90)

```javascript
// ========================================
// GLOBAL CONSTANTS (НЕ МЕНЯТЬ БЕЗ НУЖДЫ!)
// ========================================

const MENU_GROUPS = [...]        // Структура меню (8 групп)
const CATEGORY_MAP = {...}       // Карта названий (20 категорий)
const EXPECTED_CATEGORIES = [...] // Для валидации данных
const PRODUCTS_PER_LOAD = 12     // Товаров на порцию lazy loading
const SCROLL_THRESHOLD = 50      // Порог скролла (px)
const DELAY_BEFORE_NAVIGATE = 1500 // Задержка автоперехода (мс)

// ========================================
// GLOBAL VARIABLES
// ========================================

let menu = []                    // ВСЕ товары (333 шт)
let cart = []                    // Корзина
let lazyLoadObservers = new Map() // Хранилище Observer'ов

// Auto-navigation state
let lastScrollY = ...            // Текущий скролл
let autoNavigateEnabled = true   // Флаг автоперехода
let scrollAttemptCount = 0       // Счетчик попыток свайпа
let reachedEndTimestamp = null   // Время достижения конца
```

---

## 🔧 Основные Функции

### 1️⃣ **Загрузка Данных**

#### `loadMenu()` (строки 92-144)

**Назначение:** Загружает, валидирует и инициализирует меню

**Логика:**
```javascript
async function loadMenu() {
    // 1. Fetch JSON
    const response = await fetch('menu-final.json');
    
    // 2. Parse JSON
    const data = await response.json();
    
    // 3. Flatten nested structure → flat array
    menu = [
        ...(data.menu['pizza-30cm'] || []),
        ...(data.menu['piccolo-20cm'] || []),
        // ... все 18 категорий
    ];
    
    // 4. Initialize UI components
    initSidebar();
    initMobileMenu();
    renderContentWithLazyLoad();
    setupSearch();
    restoreState();
}
```

**Важно:** 
- ✅ Использует `data.menu[category]` (не `data[category]`!)
- ✅ Flat структура из nested object
- ✅ Обработка ошибок через try/catch

---

### 2️⃣ **Рендеринг Контента**

#### `renderContentWithLazyLoad()` (строки 813-912)

**Назначение:** Рендерит категории с ленивой загрузкой

**Логика:**
```javascript
function renderContentWithLazyLoad() {
    const content = document.getElementById('content');
    
    // 1. Group categories (используем MENU_GROUPS!)
    MENU_GROUPS.forEach(group => {
        // 2. Render each group
        html += `<div class="category-group">...</div>`;
        
        // 3. Render categories in group
        group.categories.forEach(cat => {
            if (cat === 'contacts' || menu.some(...)) {
                // 4. Special rendering for contacts
                if (cat === 'contacts') {
                    html += contactsHTML;
                } else {
                    // 5. Standard product grid
                    html += categoryHTML;
                }
            }
        });
    });
    
    content.innerHTML = html;
    
    // 6. Setup lazy loading для первой категории
    setupLazyLoading('pizza-30cm');
}
```

**Ключевые моменты:**
- ✅ Использует `MENU_GROUPS` (не дублировать структуру!)
- ✅ Contacts рендерится отдельно
- ✅ Lazy loading только для видимой категории

---

### 3️⃣ **Ленивая Загрузка**

#### `setupLazyLoading(categoryId)` (строки 1021-1090)

**Назначение:** Постепенная загрузка товаров по 12 штук

**Логика:**
```javascript
function setupLazyLoading(categoryId) {
    const gridElement = document.getElementById(`grid-${categoryId}`);
    const productsInCategory = menu.filter(p => p.category === categoryId);
    
    let loadedCount = 0;
    const observerIndex = lazyLoadObserverCounter++;
    
    // 1. Создаем кнопку "Загрузить еще"
    const loadMoreButton = document.createElement('button');
    loadMoreButton.textContent = `Загрузить еще ${remainingProducts} товаров`;
    
    // 2. Создаем IntersectionObserver
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && loadedCount < totalProducts) {
                // 3. Загружаем следующую порцию
                const nextBatch = productsInCategory.slice(loadedCount, loadedCount + PRODUCTS_PER_LOAD);
                
                // 4. Добавляем карточки
                nextBatch.forEach(product => {
                    const card = createProductCard(product);
                    gridElement.appendChild(card);
                    loadedCount++;
                });
                
                // 5. Обновляем кнопку
                if (loadedCount >= totalProducts) {
                    loadMoreButton.remove();
                    gridElement.dataset.readyToNavigate = 'true';
                }
            }
        });
    }, { rootMargin: '100px', threshold: 0.1 });
    
    // 6. Наблюдаем за кнопкой
    observer.observe(loadMoreButton);
    
    // 7. Сохраняем observer
    lazyLoadObservers.set(observerIndex, observer);
}
```

**Важно:**
- ✅ `PRODUCTS_PER_LOAD = 12` (константа!)
- ✅ `rootMargin: '100px'` - начинает загружать заранее
- ✅ `dataset.readyToNavigate = 'true'` - флаг для автоперехода

---

### 4️⃣ **Авто-Навигация Между Категориями**

#### Scroll Event Listener (строки 1369-1450)

**Назначение:** Автоматический переход между категориями при скролле

**Логика:**
```javascript
window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;
    const isScrollingDown = currentScrollY > lastScrollY;
    const isScrollingUp = currentScrollY < lastScrollY;
    
    const visibleCategory = getVisibleCategory();
    
    if (visibleCategory && autoNavigateEnabled) {
        const gridElement = document.getElementById(`grid-${visibleCategory}`);
        
        // Проверка: готова ли категория к переходу
        if (gridElement.dataset.readyToNavigate === 'true') {
            const rect = gridElement.getBoundingClientRect();
            const atEndOfCategory = rect.bottom <= windowHeight + 100;
            
            if (atEndOfCategory) {
                // 1. Запоминаем время достижения конца
                if (!reachedEndTimestamp) {
                    reachedEndTimestamp = Date.now();
                }
                
                // 2. Ждем подтверждения намерения пользователя
                const timeSinceReached = Date.now() - reachedEndTimestamp;
                
                if (isScrollingDown && timeSinceReached > DELAY_BEFORE_NAVIGATE) {
                    const distancePastEnd = currentScrollY - (maxScroll - 100);
                    
                    // 3. Требуется 2 попытки скролла за пределы
                    if (distancePastEnd > SCROLL_THRESHOLD) {
                        scrollAttemptCount++;
                        
                        if (scrollAttemptCount >= 2) {
                            // 4. Переходим к следующей категории
                            navigateToNextCategory(visibleCategory);
                            scrollAttemptCount = 0;
                        }
                    }
                }
            }
        }
    }
    
    lastScrollY = currentScrollY;
}, { passive: true });
```

**Ключевые параметры:**
- ✅ `SCROLL_THRESHOLD = 50` - насколько далеко скроллить
- ✅ `DELAY_BEFORE_NAVIGATE = 1500` - задержка перед переходом
- ✅ `scrollAttemptCount >= 2` - требуется 2 подтверждения

---

### 5️⃣ **Переключение Категорий**

#### `scrollToCategory(categoryId)` (строки 412-446)

**Назначение:** Плавный скролл к категории + сброс навигации

**Логика:**
```javascript
function scrollToCategory(categoryId) {
    // 1. Активируем навигацию
    setActiveNav(categoryId);
    
    // 2. Показываем только эту категорию
    document.querySelectorAll('.category-section').forEach(s => {
        s.style.display = 'none';
    });
    document.getElementById(`category-${categoryId}`).style.display = '';
    
    // 3. ❗ КРИТИЧНО: Сбрасываем переменные навигации
    scrollAttemptCount = 0;
    reachedEndTimestamp = null;
    autoNavigateEnabled = true;
    
    // 4. Скроллим с отступом 100px
    const offset = 100;
    const elementPosition = ...;
    window.scrollTo({
        top: elementPosition - offset,
        behavior: 'smooth'
    });
}
```

**Важно:**
- ✅ Сброс переменных ОБЯЗАТЕЛЕН (иначе зацикливание!)
- ✅ Offset 100px для заголовка

---

### 6️⃣ **Сохранение Состояния**

#### `saveState()` (строки 720-730)

**Назначение:** Сохраняет текущую категорию и позицию скролла

**Логика:**
```javascript
function saveState() {
    const activeSection = document.querySelector('.category-section:not([style*="display: none"])');
    
    if (activeSection) {
        const categoryId = activeSection.dataset.category;
        const scrollPosition = window.scrollY;
        
        // Сохраняем в localStorage
        localStorage.setItem('pizzaMenu_activeCategory', categoryId);
        localStorage.setItem('pizzaMenu_scrollPosition', scrollPosition);
    }
}

// Вызов с debounce 500ms
window.addEventListener('scroll', debounce(saveState, 500));
```

#### `restoreState()` (строки 677-718)

**Назначение:** Восстанавливает состояние после перезагрузки

**Логика:**
```javascript
function restoreState() {
    const savedCategory = localStorage.getItem('pizzaMenu_activeCategory');
    const savedPosition = localStorage.getItem('pizzaMenu_scrollPosition');
    
    if (savedCategory) {
        // Восстанавливаем категорию
        setActiveNav(savedCategory);
        document.querySelectorAll('.category-section').forEach(s => {
            s.style.display = 'none';
        });
        document.getElementById(`category-${savedCategory}`).style.display = '';
    } else {
        // Первый вход - показываем первую категорию
        setActiveNav('pizza-30cm');
    }
    
    // Восстанавливаем позицию
    if (savedPosition) {
        setTimeout(() => {
            window.scrollTo({ top: parseInt(savedPosition), behavior: 'auto' });
        }, 100);
    }
}
```

---

### 7️⃣ **Модальное Окно Товара**

#### `showProductModal(productId)` (строки 1129-1194)

**Назначение:** Показывает детальную информацию о товаре

**Логика:**
```javascript
function showProductModal(productId) {
    const product = menu.find(p => p.id === productId);
    if (!product) return;
    
    const contentDiv = document.getElementById('modal-content');
    
    // Горизонтальная сетка 50/50
    contentDiv.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
            <!-- Левая колонка: Картинка -->
            <div style="position: relative; width: 100%; height: 500px;">
                <img src="${product.image}" alt="${product.title}">
                <button onclick="closeProductModal()">✕</button>
            </div>
            
            <!-- Правая колонка: Информация -->
            <div style="display: flex; flex-direction: column; justify-content: center;">
                <h2>${product.title}</h2>
                <p>${product.description}</p>
                <div>Цена: ${product.price} ₽</div>
                <button onclick="addToCart(${product.id}); closeProductModal()">
                    Добавить в корзину
                </button>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
}
```

**Важно:**
- ✅ `event.stopPropagation()` на "+" кнопке
- ✅ Горизонтальный layout на десктопе
- ✅ Single column на мобильном

---

## 🚨 Типичные Ошибки ИИ

### ❌ НЕЛЬЗЯ ДЕЛАТЬ:

#### 1. Дублировать Константы
```javascript
// ❌ ПЛОХО
const menuGroups = [
    { title: '🍕 ПИЦЦА', categories: ['pizza-30cm', ...] }
];

// ✅ ХОРОШО
MENU_GROUPS.forEach(group => { ... });
```

#### 2. Менять Структуру Данных
```javascript
// ❌ ПЛОХО
menu = data.pizza;  // data.menu.pizza!

// ✅ ХОРОШО
menu = data.menu['pizza-30cm'];
```

#### 3. Игнорировать Сброс Переменных
```javascript
// ❌ ПЛОХО
function scrollToCategory(categoryId) {
    // Нет сброса!
    element.scrollIntoView();
}

// ✅ ХОРОШО
function scrollToCategory(categoryId) {
    scrollAttemptCount = 0;  // СБРОС!
    reachedEndTimestamp = null;
    element.scrollIntoView();
}
```

#### 4. Использовать sessionStorage
```javascript
// ❌ ПЛОХО
sessionStorage.setItem('category', cat);  // Сбросится при reload!

// ✅ ХОРОШО
localStorage.setItem('pizzaMenu_activeCategory', cat);
```

---

## ✅ Best Practices

### При Добавлении Новой Категории:

1. **Добавить в `menu-final.json`:**
```json
{
  "menu": {
    "new-category": [
      { "id": 334, "title": "...", "price": 500, ... }
    ]
  }
}
```

2. **Обновить константы:**
```javascript
const MENU_GROUPS = [
    // Добавить в нужную группу
    { title: '...', categories: [..., 'new-category'] }
];

const CATEGORY_MAP = {
    // Добавить название
    'new-category': 'Русское Название'
};

const EXPECTED_CATEGORIES = [
    // Добавить для валидации
    'new-category'
];
```

3. **Проверить уникальность ID:**
```bash
node fix-duplicate-ids.js
```

---

## 📊 Статистика Проекта

| Параметр | Значение |
|----------|----------|
| **Товаров всего** | 333 |
| **Категорий** | 18 |
| **Групп меню** | 8 |
| **Строк кода** | 1420 |
| **Уникальных ID** | 1-333 |
| **Констант** | 6 |

---

## 🔍 Поиск Проблем

### Чек-лист Диагностики:

| Проблема | Где Смотреть | Решение |
|----------|--------------|---------|
| **Не грузится меню** | `loadMenu()` строка 92 | Проверить `menu-final.json` |
| **Не работает навигация** | `scrollToCategory()` строка 412 | Проверить сброс переменных |
| **Зацикливание категорий** | Scroll listener строка 1369 | Проверить `autoNavigateEnabled` |
| **Не сохраняется состояние** | `saveState()` строка 720 | Проверить localStorage |
| **Дубликаты ID** | `menu-final.json` | Запустить `fix-duplicate-ids.js` |

---

## 📚 Дополнительные Ресурсы

### Файлы с Контекстом:

1. **`AUDIT_REPORT.md`** - Полный аудит кода (что было исправлено)
2. **`README.md`** - Краткая инструкция по проекту
3. **`archive/README.md`** - Описание вспомогательных файлов

### История Изменений:

```bash
git log --oneline
# 01f06bb 🔧 Refactor: Extract global constants
# 58ae7d6 🔧 CRITICAL FIX: Unique product IDs
# 3d66298 🧹 Move auxiliary files to /archive
```

---

## 💡 Советы ИИ-Ассистентам

### Перед Редактированием:

1. **Прочти этот файл!** (AI_DEVELOPER_HANDBOOK.md)
2. **Проверь AUDIT_REPORT.md** - какие баги уже исправлены
3. **Найди соответствующую функцию** в этом руководстве
4. **Используй существующие константы** (не дублируй!)

### При Поиске Проблем:

1. **Открой DevTools Console**
2. **Проверь ошибки** (красный текст)
3. **Посмотри console.log** (отладочная информация)
4. **Сверься с этим руководством**

### Перед Коммитом:

```bash
# 1. Проверь синтаксис
node -c js/app-delivery.js

# 2. Проверь данные
node -e "const m = require('./menu-final.json'); console.log(Object.values(m.menu).flat().length)"

# 3. Закоммить с понятным сообщением
git commit -m "🔧 Fix: краткое описание"
```

---

**Удачи в разработке! 🚀**

Если что-то непонятно — читай этот документ и комментарии в коде.
