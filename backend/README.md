# Pizza Max bot — backend

Yandex Cloud Function (Go 1.23). **Тонкий транспорт** к Max Bot API:
принимает произвольный текст с разрешённого Origin, форвардит в один
канал (chat_id зашит в Lockbox).

Форматирование сообщений живёт на фронте (`../js/app-delivery.js → formatOrderHTML`).
Backend ничего не знает о структуре заказа.

Полностью независим от фронта: своя `.env`, свои деплой-скрипты, свой
`.gitignore`. Между ними только URL функции (в `../js/config.js → maxEndpoint`).

## Контракт

```
POST /
Origin: <из allowlist>
Content-Type: application/json

{
  "text":   "<b>любой</b> текст, до 4096 байт",
  "format": "html" | "markdown"   // optional, default "html"
}

→ 200 {"ok": true}
→ 400 {"ok": false, "error": "text required" | "format must be html or markdown" | ...}
→ 403 {"ok": false, "error": "origin not allowed"}
→ 413 {"ok": false, "error": "text too long (max 4096)"}
→ 429 {"ok": false, "error": "rate limit"}      # 30 req/min на инстанс
→ 502 {"ok": false, "error": "max api status N: ..."}
```

## Структура

```
backend/
├── max-order/
│   ├── index.go     # Handler: CORS + валидация + форвард в Max API
│   └── go.mod
├── setup.sh         # 1× bootstrap (SA + Lockbox secret + права)
├── deploy.sh        # Деплой версии функции
├── .env.example     # Шаблон конфига для скриптов
└── .gitignore       # Не пускает .env в git
```

## Секреты

`MAX_TOKEN` и `MAX_CHAT_ID` живут в **Yandex Lockbox** (не env-переменные функции —
их видно в UI). Функция читает их через монтирование Lockbox при создании версии.

При ротации токена:
```bash
yc lockbox secret add-version pizza-max-bot \
  --payload '[{"key":"token","text_value":"<NEW_TOKEN>"},{"key":"chat_id","text_value":"<CHAT_ID>"}]'
./deploy.sh   # подхватит новую "latest" версию
```

## Первый запуск

Требования: установлены `yc`, `jq`, биллинг привязан к аккаунту.

```bash
cd backend/
cp .env.example .env       # отредактируй FOLDER_ID если не дефолтный
./setup.sh                 # создаст SA, Lockbox secret, права
# вписать реальный токен в Lockbox (см. вывод setup.sh)
# заполнить SA_ID, SECRET_ID в .env (см. вывод setup.sh)
./deploy.sh                # задеплоит функцию, выдаст URL
# вписать URL в ../js/config.js → maxEndpoint
```

## Защита

- CORS whitelist: `pizza.lovii.ru` + локальные dev-порты (см. `index.go:14`)
- Запросы с других Origin → 403
- Минимальная валидация payload (есть items, есть tableNumber)
- Нет rate-limiting и капчи — для пиццерии достаточно. Если начнут спамить —
  добавим Cloudflare Turnstile или yc-capabilities API Gateway сверху.

## Локальный запуск

```bash
cd max-order/
go run .                   # сначала нужен HTTP-обвязчик, см. ниже
```

В YCF сигнатура `Handler(w, r)` подключается рантаймом. Для локального теста
оборачивай в `http.HandleFunc("/", Handler); http.ListenAndServe(":8080", nil)`
в отдельном `cmd/local/main.go` (не коммить — это dev only).
