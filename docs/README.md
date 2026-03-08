# Pizza 🍕

Сайт пиццерии на HTML + CSS + JS

## Структура

```
pizza/
├── index.html      # Главная страница
├── css/
│   └── style.css   # Стили
├── js/
│   └── app.js      # Логика
└── img/            # Изображения
```

## Запуск

### Локально
Просто откройте `index.html` в браузере или используйте Live Server в VS Code.

### Docker (опционально)
```bash
docker run --rm -d -p 8080:80 -v $(pwd):/usr/share/nginx/html nginx
```
Перейдите на http://localhost:8080

## Деплой на GitHub Pages

1. Залейте изменения в репозиторий:
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. В настройках репозитория на GitHub:
   - Settings → Pages
   - Source: Deploy from branch `main` / root folder
   - Save

3. Сайт будет доступен по ссылке: `https://bestdeejay-design.github.io/pizza/`

## Технологии

- HTML5
- CSS3 (Grid, Flexbox)
- Vanilla JavaScript (ES6+)
- Адаптивный дизайн
