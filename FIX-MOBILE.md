# Исправления CSS для мобильной версии

## Проблема:
После удаления дублей CSS стал чище, но нужно исправить mobile layout

## Что исправить вручную в css/main.css:

### 1. Бургер меню - ниже (четверть экрана)
Найти строку ~1436:
```css
.mobile-menu-btn {
    position: fixed;
    bottom: 20px;  ← ИЗМЕНИТЬ НА: bottom: 25vh;
    right: 20px;
```

### 2. Меню выезжает справа (не слева)
Найти строку ~1450:
```css
.mobile-sidebar {
    position: fixed;
    top: 0;
    left: 0;  ← ИЗМЕНИТЬ НА: right: 0;
    width: 100%;  ← ИЗМЕНИТЬ НА: width: 80%; max-width: 300px;
```

### 3. Поиск фиксированный на мобильном
Добавить в @media (max-width: 768px):
```css
.search-mini {
    position: fixed;
    top: 70px; /* Высота header */
    left: 0;
    right: 0;
    width: calc(100% - 40px);
    margin: 0 20px;
    z-index: 99;
    background: rgba(36, 36, 36, 0.95);
    backdrop-filter: blur(10px);
}
```

### 4. Кнопка темы ТОЛЬКО в меню
В десктопной шапке УДАЛИТЬ кнопку theme-toggle
Оставить только в .mobile-theme-toggle

---

## Выполнить команды:

```bash
cd /Users/admin/Documents/GitHub/pizza

# 1. Бургер ниже
sed -i '' 's/bottom: 20px;/bottom: 25vh;/' css/main.css

# 2. Меню справа  
sed -i '' 's/left: 0;/right: 0; left: auto;/' css/main.css
sed -i '' 's/width: 100%;/width: 80%; max-width: 300px;/' css/main.css

# 3. Коммит
git add css/main.css
git commit -m "🔧 Fix mobile layout"
git push origin main
```

---

## Проверить:
- [ ] Бургер на четверти экрана снизу
- [ ] Меню выезжает справа
- [ ] Поиск фиксированный под шапкой
- [ ] Кнопка темы только в меню
