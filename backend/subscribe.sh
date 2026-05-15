#!/bin/bash
# Подписка функции на callback'и от Max через POST /subscriptions.
# Запускается один раз после первого ./deploy.sh.
# Идемпотентна: если подписка с этим URL уже есть — Max её обновит.

set -euo pipefail
cd "$(dirname "$0")"

[[ -f .env ]] || { echo "ERROR: backend/.env не найден"; exit 1; }
set -a && source .env && set +a

: "${FN_NAME:?FN_NAME required in .env}"
: "${SECRET_NAME:?SECRET_NAME required in .env}"

URL=$(yc serverless function get "$FN_NAME" --format json | jq -r .http_invoke_url)
TOKEN=$(yc lockbox payload get "$SECRET_NAME" --format json | jq -r '.entries[] | select(.key=="token") | .text_value')
WEBHOOK_SECRET=$(yc lockbox payload get "$SECRET_NAME" --format json | jq -r '.entries[] | select(.key=="webhook_secret") | .text_value')

[[ -n "$TOKEN" && "$TOKEN" != "null" ]] || { echo "ERROR: 'token' not in Lockbox $SECRET_NAME"; exit 1; }
[[ -n "$WEBHOOK_SECRET" && "$WEBHOOK_SECRET" != "null" ]] || { echo "ERROR: 'webhook_secret' not in Lockbox $SECRET_NAME"; exit 1; }

echo "==> Subscribing $URL to message_callback events"
RESP=$(curl -sS -X POST "https://platform-api.max.ru/subscriptions" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -nc --arg u "$URL" --arg s "$WEBHOOK_SECRET" \
    '{url: $u, update_types: ["message_callback"], secret: $s}')")

echo "$RESP" | jq . 2>/dev/null || echo "$RESP"

echo
echo "==> Текущие подписки:"
curl -sS "https://platform-api.max.ru/subscriptions" \
  -H "Authorization: $TOKEN" | jq '.subscriptions[] | {url, update_types}' 2>/dev/null || echo "(не удалось получить)"
