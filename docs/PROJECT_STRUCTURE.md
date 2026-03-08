# 📁 Структура Проекта Pizza Napoli

**Дата:** 2026-03-08  
**Статус:** ✅ Production Ready

---

## 🎯 ПРОИЗВОДСТВЕННЫЕ ФАЙЛЫ (корень)

```
pizza/
├── index.html              # Главная страница доставки
├── menu-final.json         # Канонические данные меню (333 товара)
├── README.md               # Документация проекта
├── css/
│   ├── delivery.css        # Стили для доставки (599 строк)
│   ├── style.css           # Дополнительные стили
│   └── style-new.css       # Резервные стили
├── js/
│   └── app-delivery.js     # Логика доставки (1474 строки)
└── img/                    # Изображения товаров (255 WebP)
```

---

## 📚 /docs - Документация (9 файлов)

| Файл | Назначение | Строк |
|------|------------|-------|
| **AI_DEVELOPER_HANDBOOK.md** | Полная архитектура для ИИ | 629 |
| **QUICK_REFERENCE.md** | Быстрый справочник | 208 |
| **ALL_DESCRIPTIONS.md** | Все описания товаров | 227 |
| **AUDIT_REPORT.md** | Отчет аудита кода | 463 |
| **DESCRIPTIONS_GUIDE.md** | Инструкция по сбору описаний | 184 |
| **IMAGE_OPTIMIZATION_REPORT.md** | Отчет оптимизации изображений | 244 |
| **MANUAL_DESCRIPTIONS.md** | Ручной сбор описаний | 219 |
| **GET-LONG-DESCRIPTIONS.txt** | Команда для консоли | 22 |
| **SIMPLE-WAY.txt** | Быстрый сбор описаний | 22 |

---

## 🛠️ /scripts - Вспомогательные скрипты (11 файлов)

### Python скрипты:
- **auto-scrape-descriptions.py** - Авто-сбор описаний с сайта
- **optimize-images.py** - Конвертация в WebP

### JavaScript скрипты:
- **create-descriptions.js** - Генератор описаний
- **merge-descriptions.js** - Объединение с menu-final.json
- **merge-long-descriptions.js** - Длинные описания для модалок
- **check-full-descriptions.js** - Проверка описаний
- **view-all-descriptions.js** - Просмотр всех описаний
- **fix-duplicate-ids.js** - Исправление дубликатов ID

### Bash скрипты:
- **replace-images.sh** - Замена изображений

### Утилиты:
- **scrape-descriptions.js** - Сбор описаний (DevTools)
- **update-image-extensions.js** - Обновление расширений

---

## 🗄️ /backups - Резервные копии (2 файла)

- **menu-final-old.json** - Старая версия меню (82.6 KB)
- **menu-final-old-descriptions.json** - Версия с описаниями (82.9 KB)

---

## 📦 /archive - Архив старых версий (18 файлов)

### Устаревшие HTML каталоги:
- catalog-delivery.html
- catalog-delivery-dark.html
- catalog-accordion.html
- catalog-tabbed.html

### Устаревшие JS приложения:
- app.js
- app-accordion.js
- app-tabbed.js
- app-new.js

### Документация:
- CODE_AUDIT.md
- collect-descriptions.js
- И другие вспомогательные файлы

---

## 📋 /dok - Исходные данные (62 файла)

Содержит сырые данные парсинга:
- **raw-content/** - Распарсенный контент с Tilda
- **content/** - Обработанные данные
- **parsed/** - Промежуточные файлы

---

## 🌐 GitHub Pages

**URL:** https://bestdeejay-design.github.io/pizza/

**Обновляется из:**
- `index.html` + `css/delivery.css` + `js/app-delivery.js` + `menu-final.json`

---

## ✅ ЧЕК-ЛИСТ СТРУКТУРЫ:

- [x] Все production файлы в корне
- [x] Документация в `/docs`
- [x] Скрипты в `/scripts`
- [x] Бэкапы в `/backups`
- [x] Архив в `/archive`
- [x] Исходники в `/dok`
- [x] CSS в `/css`
- [x] JS в `/js`
- [x] Изображения в `/img`

---

## 🎯 КАК РАБОТАТЬ:

### Добавить товар:
```bash
# Редактировать menu-final.json
# Коммит и пуш
git add menu-final.json
git commit -m "🍕 Add new product"
git push origin main
```

### Изменить стили:
```bash
# Редактировать css/delivery.css
git add css/delivery.css
git commit -m "🎨 Update styles"
git push origin main
```

### Изменить логику:
```bash
# Редактировать js/app-delivery.js
git add js/app-delivery.js
git commit -m "⚙️ Update logic"
git push origin main
```

### Использовать скрипт:
```bash
# Запустить скрипт из /scripts
cd scripts
node create-descriptions.js
```

---

**Проект готов к production!** 🚀
