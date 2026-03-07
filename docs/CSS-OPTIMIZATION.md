# 📁 Структура CSS Файлов

**Дата:** 2026-03-08  
**Статус:** ✅ Оптимизировано

---

## 🎯 ЕДИНЫЙ CSS ФАЙЛ

```
css/
└── main.css    # 783 строки, 16 KB, 89 классов
```

---

## 📊 ЭКОНОМИЯ:

| Показатель | Было | Стало | Изменение |
|------------|------|-------|-----------|
| **Файлов** | 3 файла | 1 файл | **-2 файла** ⬇️ |
| **Строк** | 1749 строк | 783 строки | **-966 строк** (-55%) ⬇️ |
| **Классов** | ~150 классов | 89 классов | **-61 класс** (дубли удалены) ⬇️ |
| **Размер** | ~40 KB | 16 KB | **-60%** ⬇️ |

---

## 🗑️ УДАЛЕНО:

### css/style.css (428 строк) - СТАРЫЙ ДИЗАЙН
- Старые стили продуктовых карточек
- Устаревшая цветовая схема
- Дублирующиеся классы

### css/style-new.css (724 строки) - НЕИСПОЛЬЗУЕМЫЙ DESIGN SYSTEM
- CSS переменные (не используются)
- Ненужные компоненты
- Дубликаты из delivery.css

---

## ✅ СОХРАНЕНО В main.css:

### Основные секции (783 строки):

1. **CSS Variables** (строки 1-60)
   - Цветовая палитра (dark/light theme)
   - Переменные для шрифтов, отступов, теней

2. **Header & Navigation** (строки 61-150)
   - .header, .logo, .header-actions
   - .search-mini, .cart-mini
   - .theme-toggle

3. **Layout** (строки 151-200)
   - .main-container, .sidebar, .content
   - .products-grid

4. **Product Cards** (строки 201-350)
   - .product-card (flexbox layout)
   - .product-info, .product-name, .product-description
   - .product-footer с `margin-top: auto` (прижатие к низу)
   - .product-price, .add-btn

5. **Categories** (строки 351-400)
   - .category-section, .category-header
   - .category-title, .category-subtitle
   - .nav-category, .nav-count

6. **Mobile UI** (строки 401-500)
   - .mobile-menu-btn, .burger-icon
   - .mobile-sidebar, .mobile-nav-category
   - .mobile-group-title

7. **Contacts** (строки 501-600) ← ДОБАВЛЕНО
   - .contact-card, .contact-card-lazy
   - .contacts-grid, .contact-info-item
   - .map-container, .map-pin
   - .location-1, .location-2

8. **Buttons & Actions** (строки 601-650) ← ДОБАВЛЕНО
   - .load-more-btn, .lazy-load-more
   - .btn, .btn-primary, .btn-secondary
   - .opening-badge, .opening-soon

9. **Cart** (строки 651-700)
   - .modal-overlay, .cart-modal
   - .cart-item
   - .cart-actions

10. **Responsive** (строки 701-783)
    - Mobile: до 480px
    - Tablet: 481-768px
    - Desktop: 768px+

---

## 🎨 ДОБАВЛЕНЫ КЛАССЫ ИЗ app-delivery.js:

### Контакты (20 классов):
- `.contact-card` - карточка контакта
- `.contact-card-lazy` - ленивая загрузка
- `.contact-card-title` - заголовок
- `.contacts-grid` - сетка контактов
- `.contact-info-item` - элемент информации
- `.contact-label` - метка
- `.contact-value` - значение
- `.contact-icon` - иконка
- `.map-container` - контейнер карты
- `.map-placeholder` - заглушка
- `.map-pin` - метка на карте
- `.location-1`, `.location-2` - локации
- `.opening-badge`, `.opening-soon` - бейджи

### Навигация (5 классов):
- `.category-subtitle` - подзаголовок категории
- `.nav-count`, `.mobile-nav-count` - счетчики товаров
- `.mobile-divider` - разделитель
- `.mobile-group-title` - заголовок группы

### Загрузка (3 класса):
- `.load-more-btn` - кнопка загрузки
- `.lazy-load-more` - индикатор
- `.cart-item` - элемент корзины

---

## 🔍 КАК ИСПОЛЬЗОВАТЬ:

### Подключение в HTML:
```html
<head>
    <link rel="stylesheet" href="css/main.css">
</head>
```

### Добавление новых стилей:
```css
/* css/main.css */

/* Новый класс */
.my-new-class {
    /* стили */
}

/* Мобильная версия */
@media (max-width: 768px) {
    .my-new-class {
        /* мобильные стили */
    }
}
```

---

## ✅ ПРЕИМУЩЕСТВА:

✅ **Один файл** - легко поддерживать  
✅ **Нет дублей** - каждый класс уникален  
✅ **Все классы работают** - используются в index.html + app-delivery.js  
✅ **Меньше размер** - 16 KB вместо 40 KB  
✅ **Быстрая загрузка** - один запрос вместо трех  
✅ **Понятная структура** - секции сгруппированы  

---

## 🌐 GitHub Pages:

**Работает:** https://bestdeejay-design.github.io/pizza/

**CSS загружается из:** `css/main.css`

---

**Оптимизация завершена!** 🚀
