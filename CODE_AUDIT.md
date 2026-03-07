# 📊 Pizza Napoli Delivery - Полный Аудит Кода

## 🎯 Общее Описание

Современное одностраничное приложение для доставки пиццы с:
- ✅ **Двухколоночная верстка**: левая навигация + правый контент
- ✅ **Ленивая загрузка товаров**: по 12 штук на категорию
- ✅ **Умная авто-навигация**: переход между категориями при скролле
- ✅ **Модальное окно товара**: детальная информация с фото 50/50
- ✅ **Темная тема**: премиум дизайн с неоновыми акцентами
- ✅ **Адаптивность**: полная поддержка мобильных устройств

---

## 📁 Структура Файлов

```
pizza/
├── index.html                    # Главная страница (темная тема)
├── catalog-delivery-dark.html    # Каталог (темная тема)
├── catalog-delivery.html         # Каталог (светлая тема)
├── menu-final.json               # Канонические данные меню
├── js/
│   └── app-delivery.js           # Основная логика приложения (1386 строк)
├── css/                          # Стили (встроены в HTML)
└── dok/                          # Вспомогательные файлы
```

---

## 🔧 Основные Компоненты

### 1. **Глобальные Переменные** (строка 2-6)

```javascript
let menu = [];                    // Все товары из JSON
let cart = [];                    // Корзина пользователя
let visibleCategories = new Set(); // Видимые категории
let lazyLoadObservers = new Map(); // IntersectionObserver для lazy loading
const PRODUCTS_PER_LOAD = 12;     // Товаров для первоначальной загрузки
```

---

### 2. **Загрузка Данных** (строка 8-53)

**Функция**: `loadMenu()`

**Что делает**:
1. Загружает `menu-final.json`
2. Объединяет все категории в плоский массив
3. Инициализирует сайдбар и мобильное меню
4. Рендерит контент с lazy loading
5. Восстанавливает состояние из localStorage

**Порядок инициализации**:
```javascript
initSidebar()
initMobileMenu()
renderContentWithLazyLoad()
setupSearch()
restoreState()  // ← Восстановление ПОСЛЕ рендеринга
```

---

### 3. **Навигация (Сайдбар)** (строка 65-158)

**Функция**: `initSidebar()`

**Структура меню**:
```
🍕 ПИЦЦА
├─ Пицца 30 см (32)
├─ Pizza Piccolo 20 см (9)
└─ Кальцоне (4)

🍣 СУШИ & РОЛЛЫ
├─ Суши (7)
└─ Роллы (13)

🍞 ХЛЕБ И ФОКАЧЧА
├─ Хлеб (2)
└─ Фокачча (3)

... (еще 5 групп)
```

**Особенности**:
- Группировка по категориям пиццерии
- Разделители между группами (1px border)
- Счетчик товаров в каждой категории
- Розовые заголовки групп (#ff2e55)

---

### 4. **Рендеринг Контента** (строка 727-841)

**Функция**: `renderContentWithLazyLoad()`

**Алгоритм**:
1. Берет порядок категорий из sidebar
2. Фильтрует товары по каждой категории
3. Рендерит HTML с `display:none` кроме первой
4. Для каждого грида создает `data-loaded="0"`
5. Добавляет кнопку "Показать еще" если товаров > 12
6. Вызывает `setupLazyLoading()` для каждой категории

**Пример структуры**:
```html
<div class="category-section" id="category-pizza-30cm">
    <div class="category-header">
        <h2>Пицца 30 см</h2>
        <p>32 товаров</p>
    </div>
    <div class="products-grid" id="grid-pizza-30cm" data-loaded="0">
        <!-- 12 товаров изначально -->
    </div>
    <div class="lazy-load-more">
        <button onclick="loadMoreProducts('pizza-30cm')">Показать еще</button>
    </div>
</div>
```

---

### 5. **Ленивая Загрузка** (строка 920-1046)

#### 5.1 `setupLazyLoading(categoryId)` (строка 920-973)

**Что делает**:
- Создает `IntersectionObserver` с `rootMargin: '100px'`
- Наблюдает за последней карточкой в гриде
- При пересечении вызывает `loadMoreProducts()`

**Параметры Observer**:
```javascript
{
    root: null,           // viewport
    rootMargin: '100px',  // запас до конца экрана
    threshold: 0.1        // 10% видимости
}
```

#### 5.2 `loadMoreProducts(categoryId, event)` (строка 974-1046)

**Алгоритм**:
1. Берет следующую порцию товаров (`loadedCount` → `loadedCount + 12`)
2. Если товаров нет → выход
3. Рендерит новые карточки с анимацией `fadeInUp`
4. Обновляет `data-loaded` и пересоздает Observer
5. Если все загружено → удаляет кнопку "Показать еще"
6. Помечает категорию флагом `data-readyToNavigate='true'`

**Анимация карточек**:
```javascript
style="opacity: 0; transform: translateY(20px); 
       animation: fadeInUp 0.5s ease forwards; 
       animation-delay: ${idx * 0.05}s;"
```

---

### 6. **Умная Авто-Навигация** (строка 1290-1365)

#### 6.1 Глобальные Переменные

```javascript
let lastScrollY = window.scrollY;
let autoNavigateEnabled = true;
let scrollAttemptCount = 0;          // Счетчик попыток скролла
let reachedEndTimestamp = null;      // Когда достигли конца
const SCROLL_THRESHOLD = 50;         // Насколько далеко скроллить (px)
const DELAY_BEFORE_NAVIGATE = 1500;  // Задержка перед переходом (мс)
```

#### 6.2 Scroll Event Listener (строка 1296-1365)

**Алгоритм перехода ВНИЗ**:
```javascript
window.addEventListener('scroll', () => {
    if (isScrollingDown && autoNavigateEnabled) {
        const visibleCategory = getVisibleCategory();
        
        if (atEndOfCategory && readyToNavigate) {
            // 1. Запоминаем когда достигли конца
            if (!reachedEndTimestamp) {
                reachedEndTimestamp = Date.now();
            }
            
            // 2. Ждем 1.5 секунды
            const timeSinceReached = Date.now() - reachedEndTimestamp;
            
            // 3. Проверяем насколько далеко скроллишь за пределы
            if (timeSinceReached > 1500 && distancePastEnd > 50px) {
                scrollAttemptCount++;
                
                // 4. Требуем 2 попытки
                if (scrollAttemptCount >= 2) {
                    navigateToNextCategory(visibleCategory);
                }
            }
        }
    }
});
```

**Алгоритм возврата ВВЕРХ**:
```javascript
if (isScrollingUp && rect.top > 0) {
    // Если у самого начала текущей категории
    navigateToPreviousCategory(visibleCategory);
}
```

#### 6.3 `navigateToNextCategory(currentCategoryId)` (строка 1048-1075)

**Что делает**:
1. Находит следующую категорию в orderedCategories
2. Сбрасывает `readyToNavigate='false'` для текущей
3. Разблокирует `autoNavigateEnabled = true`
4. Сбрасывает счетчики (`scrollAttemptCount`, `reachedEndTimestamp`)
5. Через 800мс вызывает `scrollToCategory(nextCategoryId)`

#### 6.4 `navigateToPreviousCategory(currentCategoryId)` (строка 1078-1100)

**Что делает**:
1. Находит предыдущую категорию
2. Просто скроллит к ней (без проверок готовности)
3. Логирует если категория еще не полностью загружена

#### 6.5 `scrollToCategory(categoryId)` (строка 412-446)

**Критически важное исправление** (строка 428-431):
```javascript
// СБРОС ПЕРЕМЕННЫХ НАВИГАЦИИ ПРИ ПЕРЕКЛЮЧЕНИИ КАТЕГОРИИ
scrollAttemptCount = 0;
reachedEndTimestamp = null;
autoNavigateEnabled = true;
```

**Без этого** после перехода к следующей категории счетчик оставался заполненным и перекидывало сразу дальше!

---

### 7. **Сохранение Состояния** (строка 665-718)

#### 7.1 `saveState()` (строка 665-675)

**Срабатывает**: при каждом скролле (debounce 500мс)

**Сохраняет**:
```javascript
localStorage.setItem('pizzaMenu_activeCategory', categoryId);
localStorage.setItem('pizzaMenu_scrollPosition', window.scrollY);
```

#### 7.2 `restoreState()` (строка 677-718)

**ИСПРАВЛЕНО**: используем `localStorage` вместо `sessionStorage`

**Алгоритм**:
```javascript
const savedCategory = localStorage.getItem('pizzaMenu_activeCategory');
const savedPosition = localStorage.getItem('pizzaMenu_scrollPosition');

if (savedCategory) {
    // Восстанавливаем категорию
    setActiveNav(savedCategory);
    showOnlyCategory(savedCategory);
} else {
    // Первый вход - открываем pizza-30cm
}

if (savedPosition) {
    // Восстанавливаем позицию скролла
    window.scrollTo({ top: parseInt(savedPosition) });
}
```

**Когда вызывается**:
- Сразу после `renderContentWithLazyLoad()` в `loadMenu()`
- Контент уже отрендерен, элементы существуют

---

### 8. **Модальное Окно Товара** (строка 1129-1253)

#### 8.1 `showProductModal(productId)` (строка 1129-1194)

**Структура (горизонтальная 50/50)**:
```html
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
    <!-- Левая колонка: Фото -->
    <div style="width: 100%; height: 500px;">
        <img src="${product.image}" style="object-fit: cover;">
        <button onclick="closeProductModal()">✕</button>
    </div>
    
    <!-- Правая колонка: Инфо -->
    <div style="display: flex; flex-direction: column;">
        <h2>${product.title}</h2>
        ${product.description ? '<p>...</p>' : ''}
        
        <div style="display: flex; gap: 20px;">
            <div>Цена: ${product.price} ₽</div>
            <div>Вес: ${product.weight} г</div>
        </div>
        
        ${product.addons ? '<div>Дополнения: ...</div>' : ''}
        
        <button onclick="addToCart(${product.id})">
            Добавить в корзину • ${product.price} ₽
        </button>
    </div>
</div>
```

**Адаптивность** (строка 1237-1245):
```css
@media (max-width: 768px) {
    #product-modal-content > div {
        grid-template-columns: 1fr !important; /* Одна колонка */
    }
    #product-modal-content img {
        height: 300px !important; /* Фото поменьше */
    }
}
```

#### 8.2 Создание Модального Окна (строка 1204-1253)

**Функция**: `createProductModal()`

**Что делает**:
- Создает overlay с `z-index: 2000`
- Добавляет стиль с медиа-запросом для мобильных
- Вешает обработчик закрытия по клику на фон

---

### 9. **Карточка Товара** (строка 859-869)

**Структура**:
```html
<div class="product-card" 
     data-id="${product.id}" 
     onclick="showProductModal(${product.id})">
    
    <div class="product-image-wrapper">
        <img src="${product.image}" 
             onerror="this.src='data:image/svg+xml,...'">
    </div>
    
    <div class="product-info">
        <h3 class="product-name">${product.title}</h3>
        <p class="product-description">${product.description || ''}</p>
        
        <div class="product-footer">
            <span class="product-price">${product.price} ₽</span>
            <button class="add-btn" 
                    onclick="event.stopPropagation(); addToCart(${product.id})">+</button>
        </div>
    </div>
</div>
```

**Обработчики**:
- `onclick` на карточке → открыть модалку
- `onclick` на кнопке "+" → добавить в корзину (с `stopPropagation`)

---

## 🔄 Поток Данных

### 1. Первичная Загрузка
```
DOMContentLoaded
    ↓
loadMenu()
    ↓
fetch('menu-final.json')
    ↓
flatten all categories → menu[]
    ↓
initSidebar() → render groups
initMobileMenu() → render mobile version
renderContentWithLazyLoad() → create DOM
setupSearch() → add input listener
restoreState() → load from localStorage
```

### 2. Ленивая Загрузка
```
User scrolls category
    ↓
IntersectionObserver triggers (last card visible)
    ↓
loadMoreProducts(categoryId)
    ↓
slice next 12 products
    ↓
render with fadeInUp animation
    ↓
update data-loaded counter
    ↓
recreate observer for new cards
    ↓
if (all loaded) {
    remove "Load More" button
    set data-readyToNavigate='true'
}
```

### 3. Авто-Переход
```
User reaches end of category
    ↓
scrollEventListener detects:
    - atEndOfCategory = true
    - readyToNavigate = true
    ↓
wait 1.5 seconds
    ↓
user scrolls down 50px+ (attempt 1/2)
user scrolls down 50px+ (attempt 2/2)
    ↓
navigateToNextCategory(current)
    ↓
reset: count=0, timestamp=null, enabled=true
    ↓
after 800ms → scrollToCategory(next)
    ↓
SCROLL AGAIN: reset variables again (critical!)
```

### 4. Сохранение/Восстановление
```
Every scroll (debounced 500ms)
    ↓
saveState()
    ↓
localStorage: { activeCategory, scrollPosition }
    ↓
[User refreshes page]
    ↓
loadMenu() → renderContent()
    ↓
restoreState()
    ↓
read from localStorage
    ↓
setActiveNav(category)
showOnlyCategory(category)
scrollTo saved position
```

---

## 🎨 UI Компоненты

### 1. Сайдбар (Desktop)
- **Широина**: 280px
- **Позиция**: sticky, left
- **Группы**: 8 с розовыми заголовками (#ff2e55)
- **Разделители**: 1px border между группами
- **Активный элемент**: розовый фон + текст

### 2. Мобильное Меню
- **Кнопка**: ☰ бургер в хедере
- **Overlay**: fullscreen на весь экран
- **Анимация**: slide-in справа
- **Закрытие**: по крестику или клику вне

### 3. Карточки Товаров
- **Grid**: 2 колонки на мобильном (320-420px)
- **Grid**: 4 колонки на desktop (>768px)
- **Анимация**: fadeInUp при загрузке
- **Hover**: тень + трансформация

### 4. Модальное Окно
- **Desktop**: 2 колонки (50% фото + 50% инфо)
- **Mobile**: 1 колонка (фото сверху 300px)
- **Фон**: rgba(0,0,0,0.8)
- **Размер**: max-width 900px

---

## 📦 Структура Данных

### Menu Item Schema:
```json
{
    "id": 123,
    "title": "Пепперони",
    "description": "Классическая пицца...",  // Опционально
    "price": 565,
    "image": "/images/pepperoni.jpg",
    "category": "pizza-30cm",
    "weight": 450  // Опционально
}
```

### Category Groups:
```javascript
[
    { title: '🍕 ПИЦЦА', categories: ['pizza-30cm', 'piccolo-20cm', 'calzone'] },
    { title: '🍣 СУШИ & РОЛЛЫ', categories: ['rolls-sushi', 'rolls-rolls'] },
    { title: '🍞 ХЛЕБ И ФОКАЧЧА', categories: ['bread-focaccia-bread', 'bread-focaccia-focaccia'] },
    { title: '🍱 НАБОРЫ', categories: ['combo'] },
    { title: '🍰 ДЕСЕРТЫ', categories: ['confectionery'] },
    { title: '🥤 НАПИТКИ', categories: ['mors', 'juice', 'water', 'soda', 'beverages-other'] },
    { title: '👨‍🍳 ГОТОВИМ ДОМА', categories: ['frozen', 'aromatic-oils'] },
    { title: 'ℹ️ ИНФОРМАЦИЯ', categories: ['masterclass', 'franchise', 'contacts'] }
]
```

---

## ⚠️ Критические Исправления

### 1. Сброс Переменных Навигации (строка 428-431)
**Проблема**: После перехода к следующей категории сразу перекидывало дальше

**Решение**: Сбрасывать `scrollAttemptCount`, `reachedEndTimestamp`, `autoNavigateEnabled` в `scrollToCategory()`

### 2. Восстановление Состояния (строка 677-718)
**Проблема**: При перезагрузке страницы возвращало в начало каталога

**Решение**: Использовать `localStorage` вместо `sessionStorage` (не сбрасывается при reload)

### 3. Timing Восстановления (строка 47)
**Проблема**: restoreState() вызывался ДО рендеринга контента

**Решение**: Вызывать СТРОГО ПОСЛЕ `renderContentWithLazyLoad()`

---

## 🎯 Возможности для Улучшения

### 1. Можно Удалить
- ❌ `visibleCategories` - нигде не используется
- ❌ `renderContent()` - дублируется с `renderContentWithLazyLoad()`
- ❌ `renderContactsLazy()` - только для контактов, можно упростить

### 2. Рефакторинг
- 🔧 Дублирование `menuGroups` в 5 функциях → вынести в константу
- 🔧 Дублирование `categoryMap` в 3 функциях → вынести в константу
- 🔧 `getOrderedCategories()` дублирует логику → использовать одну функцию

### 3. Производительность
- ⚡ Debounce для saveState() уже есть (500мс) ✅
- ⚡ IntersectionObserver для lazy loading ✅
- ⚡ Passive event listeners для скролла ✅

### 4. Баги
- 🐛 Если быстро скроллить вверх/вниз может зациклить
- 🐛 При быстром переключении категорий могут быть гонки
- 🐛 Modal создается каждый раз заново вместо reuse

---

## 📝 Changelog Последних Изменений

### v1.0 - Smart Auto-Navigation (2026-03-05)
- ✅ Умный переход между категориями при скролле вниз
- ✅ Возврат к предыдущей категории при скролле вверх
- ✅ Защита от случайных переключений (2 попытки + 1.5с задержка)
- ✅ Горизонтальное модальное окно (50/50 фото + инфо)
- ✅ Восстановление состояния после перезагрузки страницы

### v0.9 - Lazy Loading
- ✅ Ленивая загрузка товаров по 12 штук
- ✅ IntersectionObserver для автоматической подгрузки
- ✅ Кнопка "Показать еще" для ручного контроля

### v0.8 - Mobile Responsive
- ✅ Адаптивное мобильное меню (fullscreen overlay)
- ✅ 2-колоночный grid для карточек (320-420px)
- ✅ Скрытие темы в хедере на мобильном

---

## 🔗 Зависимости

### Внешние:
- **Google Fonts**: Inter (300, 400, 600, 700, 800)
- **Font Awesome**: Иконки для навигации

### Внутренние:
- **menu-final.json**: Канонические данные меню (~333 товара)
- **app-delivery.js**: Вся бизнес-логика (1386 строк)

---

## 📊 Метрики

| Метрика | Значение |
|---------|----------|
| **Строк кода** | 1386 |
| **Функций** | ~35 |
| **Глобальных переменных** | 6 |
| **LocalStorage keys** | 2 (activeCategory, scrollPosition) |
| **Товаров всего** | ~333 |
| **Категорий** | 20+ |
| **Групп меню** | 8 |

---

**Документ создан**: 2026-03-05  
**Версия**: 1.0  
**Статус**: Актуально
