# 🚀 Yandex Eda Parser - Quick Start

**Статус:** ✅ ГОТОВ К ЗАПУСКУ  
**Время настройки:** 15 минут  
**Результат:** JSON с весами, описаниями, ингредиентами и КБЖУ

---

## 📋 ЧТО НУЖНО

1. **Браузер:** Chrome или Firefox
2. **Расширение:** Tampermonkey
3. **Авторизация:** Аккаунт Yandex (телефон/email)
4. **Скрипт:** Готовый код (см. ниже)

---

## 🔧 УСТАНОВКА (15 МИНУТ)

### Шаг 1: Установить Tampermonkey

**Chrome:**
```
https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo
```

**Firefox:**
```
https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/
```

**Safari:**
```
https://apps.apple.com/app/tampermonkey/id1482490089
```

---

### Шаг 2: Создать новый скрипт

1. Кликнуть на иконку Tampermonkey в браузере
2. Нажать **"Create a new script"**
3. Открыть файл [`parsers/yandex-eda-tampermonkey-script.js`](parsers/yandex-eda-tampermonkey-script.js)
4. Скопировать ВЕСЬ код
5. Вставить в редактор Tampermonkey
6. Нажать **File → Save** (или Ctrl+S)

---

### Шаг 3: Авторизоваться в Yandex Eda

1. Перейти на https://eda.yandex.ru/r/pizza_napoli_bmroq
2. Войти в аккаунт (если не авторизован)
3. Убедиться что меню загружено

---

### Шаг 4: Запустить скрипт

1. Обновить страницу (F5)
2. Через 3 секунды появится кнопка **"🚀 Начать сбор данных"**
3. Нажать кнопку
4. Скрипт автоматически откроет все модалки и соберёт данные

---

## 📊 ЧТО СОБИРАЕТ СКРИПТ

Для каждого продукта:

```json
{
  "title": "Пицца Маргарита",
  "normalizedTitle": "пицца маргарита",
  "weight": "480 г",
  "price": 650,
  "description": "Классическая итальянская пицца...",
  "ingredients": ["томаты", "моцарелла", "базилик"],
  "nutrition": {
    "proteins": 12.5,
    "fats": 8.3,
    "carbs": 25.1,
    "calories": 220
  },
  "url": "https://eda.yandex.ru/r/pizza_napoli_bmroq",
  "collectedAt": "2026-03-05T..."
}
```

---

## ⏱️ ПРОЦЕСС СБОРА

1. Скрипт находит все продукты на странице
2. Для каждого продукта:
   - Открывает модалку
   - Ждёт 2.5 секунды
   - Извлекает данные
   - Закрывает модалку
   - Ждёт 0.8 секунды
3. Сохраняет JSON файл

**Время сбора:** ~5-7 минут для 150 продуктов

---

## 📥 РЕЗУЛЬТАТ

Файл скачается автоматически:
```
yandex-eda-complete-data.json
```

**Структура файла:**
```json
{
  "source": "Yandex Eda",
  "restaurant": "Pizza Napoli",
  "url": "https://eda.yandex.ru/r/pizza_napoli_bmroq",
  "collectedAt": "2026-03-05T...",
  "totalProducts": 150,
  "products": [...]
}
```

---

## ✅ ЧТО ДЕЛАТЬ ПОСЛЕ СБОРА

### 1. Проверить данные
```bash
# Посмотреть сколько собрано
cat parsers/yandex-eda-complete-data.json | jq '.totalProducts'
```

### 2. Объединить с Tilda данными
```javascript
// Скрипт для merge будет создан отдельно
node parsers/merge-yandex-tilda-data.js
```

### 3. Обновить menu-final.json
```javascript
node parsers/update-menu-from-yandex.js
```

---

## 🎯 ПРЕИМУЩЕСТВА ЭТОГО МЕТОДА

✅ **Бесплатно** - не нужно платить за сервисы  
✅ **Быстро** - 15 минут настройки  
✅ **Надёжно** - работает в вашем браузере  
✅ **Автоматически** - сам открывает все модалки  
✅ **Полные данные** - вес, цена, описание, ингредиенты, КБЖУ  
✅ **Готовый JSON** - сразу можно использовать  

---

## ⚠️ ВОЗМОЖНЫЕ ПРОБЛЕМЫ

### Проблема 1: Скрипт не запускается
**Решение:** Обновить страницу (F5), подождать 3 секунды

### Проблема 2: Модалки не открываются
**Решение:** Проверить авторизацию в Yandex Eda

### Проблема 3: Данные не сохраняются
**Решение:** Разрешить Tampermony скачивание файлов в настройках

### Проблема 4: Скрипт зависает
**Решение:** Обновить страницу, запустить заново (данные сохраняются постепенно)

---

## 🆘 АЛЬТЕРНАТИВНЫЕ МЕТОДЫ

Если Tampermonkey не подходит, есть ещё 4 метода:

1. **2Captcha + Puppeteer** - платно ($1-3/1000), автоматизированно
2. **Cookie Export** - бесплатно, но требует ручной работы
3. **Bright Data API** - платно ($1.50/1000), готовый API
4. **Manual DevTools** - бесплатно, полностью вручную

См. [`parsers/YANDEX-EDA-BYPASS-METHODS.md`](parsers/YANDEX-EDA-BYPASS-METHODS.md)

---

## 📞 ТЕХПОДДЕРЖКА

Вопросы? Смотри документацию:

- [START-HERE.md](../START-HERE.md) - быстрый старт
- [YANDEX-EDA-BYPASS-METHODS.md](YANDEX-EDA-BYPASS-METHODS.md) - все методы
- [PARSER-ANALYSIS-SUMMARY.md](PARSER-ANALYSIS-SUMMARY.md) - анализ парсеров

---

**🎉 ГОТОВО!** После настройки просто нажми кнопку и получи данные через 5-7 минут.
