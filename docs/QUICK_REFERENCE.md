# 🚀 Quick Reference - Pizza Napoli

**Для быстрого поиска:** Где что находится и как работает

---

## 📍 ГЛАВНЫЕ ФАЙЛЫ

| Файл | Назначение | Строк | Можно трогать? |
|------|------------|-------|----------------|
| **js/app-delivery.js** | Вся логика приложения | 1474 | ✅ ДА |
| **index.html** | Главная страница | 914 | ✅ ДА |
| **menu-final.json** | Данные меню (333 товара) | 83KB | ⚠️ Через скрипты |
| **css/style.css** | Стили | ~600 | ✅ ДА |
| **AI_DEVELOPER_HANDBOOK.md** | Полная документация | 629 | ✅ ЧИТАТЬ |
| **archive/** | Старые версии | ❌ НЕТ | ❌ НЕ ТРОГАТЬ |

---

## 🔍 БЫСТРЫЙ ПОИСК ФУНКЦИЙ

### Загрузка Данных
- **`loadMenu()`** → строка 109
- **`setupLazyLoading()`** → строка 1038
- **`loadMoreProducts()`** → строка 1072

### Рендеринг
- **`renderContentWithLazyLoad()`** → строка 813
- **`renderContent()`** → строка 251
- **`renderProducts()`** → строка 431

### Навигация
- **`scrollToCategory()`** → строка 412
- **`navigateToNextCategory()`** → строка 1147
- **`navigateToPreviousCategory()`** → строка 1176
- **Scroll listener** → строка 1369

### Состояние
- **`saveState()`** → строка 720
- **`restoreState()`** → строка 677
- **`setActiveNav()`** → строка 400

### Корзина и Модалки
- **`addToCart()`** → строка 448
- **`showProductModal()`** → строка 1232
- **`updateCartTotal()`** → строка 463

### Утилиты
- **`getUniqueCategories()`** → строка 55
- **`getVisibleCategory()`** → строка 1463
- **`getOrderedCategories()`** → строка 1201

---

## 📊 КОНСТАНТЫ

| Константа | Значение | Где Используется |
|-----------|----------|------------------|
| `PRODUCTS_PER_LOAD` | 12 | Lazy loading |
| `SCROLL_THRESHOLD` | 50px | Автопереход категорий |
| `DELAY_BEFORE_NAVIGATE` | 1500ms | Задержка перед переходом |
| `MENU_GROUPS` | 8 групп | Структура меню |
| `CATEGORY_MAP` | 20 категорий | Названия на русском |

---

## 🗂️ СТРУКТУРА МЕНЮ

```
🍕 ПИЦЦА (3 категории)
├─ pizza-30cm (49 товаров, ID 1-49)
├─ piccolo-20cm (39 товаров, ID 50-88)
└─ calzone (69 товаров, ID 89-157)

🍣 СУШИ & РОЛЛЫ (2 категории)
├─ rolls-sushi (23 товара, ID 213-235)
└─ rolls-rolls (32 товара, ID 236-267)

🍞 ХЛЕБ И ФОКАЧЧА (2 категории)
├─ bread-focaccia-bread (38 товаров, ID 158-195)
└─ bread-focaccia-focaccia (6 товаров, ID 196-201)

... и так далее до 333 товаров
```

---

## ⚡ КРИТИЧЕСКИ ВАЖНО

### ❌ НИКОГДА НЕ ДЕЛАЙ:
1. Не дублируй `MENU_GROUPS` и `CATEGORY_MAP` - они в константах!
2. Не используй `sessionStorage` - только `localStorage`
3. Не забывай сбрасывать переменные в `scrollToCategory()`
4. Не меняй структуру `data.menu[category]` на `data[category]`

### ✅ ВСЕГДА ДЕЛАЙ:
1. Проверяй `AI_DEVELOPER_HANDBOOK.md` перед редактированием
2. Используй существующие константы
3. Добавляй комментарии к новым функциям
4. Тестируй на мобильной версии

---

## 🐛 ОТЛАДКА

### Console Logs:
```javascript
// Включение/выключение отладки
console.log('Menu loaded:', menu.length);
console.log('Rendering category:', categoryId);
console.log('Auto-navigation triggered');
```

### Проверка Данных:
```bash
# Количество товаров
node -e "const m = require('./menu-final.json'); console.log(Object.values(m.menu).flat().length)"

# Проверка дубликатов ID
node -e "const m = require('./menu-final.json'); const ids = Object.values(m.menu).flat().map(p => p.id); console.log('Duplicates:', ids.filter((id, i) => ids.indexOf(id) !== i).length)"
```

### DevTools Commands:
```javascript
// Посмотреть текущее меню
console.table(menu.slice(0, 10))

// Проверить активную категорию
document.querySelector('.category-section:not([style*="display: none"])')

// Посмотреть корзину
console.log(cart)
```

---

## 🔧 БЫСТРЫЕ ФИКСЫ

### Сброс состояния:
```bash
# Очистить localStorage
localStorage.clear()

# Перезагрузить без кэша
Ctrl + Shift + R (Win)
Cmd + Shift + R (Mac)
```

### Проверка после изменений:
```bash
# Синтаксис JS
node -c js/app-delivery.js

# Валидация JSON
node -e "JSON.parse(require('fs').readFileSync('menu-final.json'))"
```

---

## 📱 ТЕСТИРОВАНИЕ

### Чек-лист:
- [ ] Десктоп: сайдбар, навигация, корзина
- [ ] Мобильный: гамбургер, свайпы, сетка 2 колонки
- [ ] Ленивая загрузка (скролл вниз)
- [ ] Автопереход между категориями
- [ ] Модальные окна товаров
- [ ] Поиск товаров
- [ ] Темная/светлая тема

### URL для теста:
- **Production:** https://bestdeejay-design.github.io/pizza/
- **Local:** http://localhost:8000 (python -m http.server)

---

## 📚 ДОКУМЕНТАЦИЯ

| Документ | Описание | Строк |
|----------|----------|-------|
| **AI_DEVELOPER_HANDBOOK.md** | Полная архитектура | 629 |
| **AUDIT_REPORT.md** | Отчет аудита | 463 |
| **README.md** | Краткий старт | 128 |
| **QUICK_REFERENCE.md** | Этот файл | ~200 |

---

## 🎯 ПРИОРИТЕТЫ

### Критично (ломает сайт):
1. ❌ Дубликаты ID → `fix-duplicate-ids.js`
2. ❌ Неправильный fetch → `data.menu[category]`
3. ❌ Нет сброса переменных → зацикливание

### Важно (ухудшает UX):
1. ⚠️ Медленная загрузка → оптимизировать картинки
2. ⚠️ Глюки навигации → проверить scroll listener
3. ⚠️ Пустая корзина → проверить addToCart()

### Желательно (улучшения):
1. 💡 WebP формат изображений
2. 💡 Индикатор загрузки
3. 💡 SEO мета-теги

---

**Сохраните этот файл как шпаргалку!** 📌
