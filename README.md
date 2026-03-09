# Pizza Napoli Parsers

Парсеры для сбора точных данных о товарах.

## Установка

```bash
npm install puppeteer cheerio
```

## Использование

### 1. Парсинг Яндекс Еды (веса + описания)

```bash
node parsers/yandex-eda-parser.js
```

**Результат:** `yandex-data.json` с весами и описаниями

### 2. Парсинг модалок с сайта

```bash
node parsers/modal-descriptions-parser.js
```

**Результат:** `modal-data.json` с точными описаниями

### 3. Объединение данных

```bash
node parsers/merge-data.js
```

**Результат:** Обновленный `menu-final.json` с точными данными

## Структура выходных данных

### yandex-data.json
```json
{
  "title": "Pizza Margherita",
  "weight": "500 г",
  "description": "Классическая пицца...",
  "price": 650
}
```

### modal-data.json
```json
{
  "title": "Pizza Margherita",
  "fullDescription": "Подробное описание из модалки...",
  "ingredients": ["томаты", "моцарелла"]
}
```

## Конфигурация

Измените `config.json` для настройки:
- URL источников
- Селекторы элементов
- Папки для сохранения
