#!/bin/bash
# Деплой новой версии Cloud Function. Можно запускать сколько угодно раз —
# каждая версия иммутабельна, откат через `yc serverless function version list`.

set -euo pipefail
cd "$(dirname "$0")"

[[ -f .env ]] || { echo "ERROR: backend/.env не найден. Запусти ./setup.sh"; exit 1; }
set -a && source .env && set +a

: "${FN_NAME:?FN_NAME required in .env}"
: "${SA_ID:?SA_ID required in .env}"
: "${SECRET_ID:?SECRET_ID required in .env}"
: "${SECRET_NAME:?SECRET_NAME required in .env}"

echo "==> Resolve current Lockbox version"
SECRET_VERSION_ID=$(yc lockbox secret get "$SECRET_NAME" --format json | jq -r .current_version.id)
echo "    version=$SECRET_VERSION_ID"

echo "==> Ensure function exists: $FN_NAME"
yc serverless function create --name "$FN_NAME" \
  --description "Pizza Max bot order forwarder" 2>&1 | grep -v "already exists" || true

echo "==> Make function publicly invokable (no IAM token required)"
yc serverless function allow-unauthenticated-invoke "$FN_NAME" 2>&1 | grep -v "already" || true

echo "==> Create new version"
yc serverless function version create \
  --function-name "$FN_NAME" \
  --runtime golang123 \
  --source-path ./max-order \
  --entrypoint index.Handler \
  --memory 128m \
  --execution-timeout 10s \
  --service-account-id "$SA_ID" \
  --secret "environment-variable=MAX_TOKEN,id=$SECRET_ID,version-id=$SECRET_VERSION_ID,key=token" \
  --secret "environment-variable=MAX_CHAT_ID,id=$SECRET_ID,version-id=$SECRET_VERSION_ID,key=chat_id"

URL=$(yc serverless function get "$FN_NAME" --format json | jq -r .http_invoke_url)
cat <<EOF

✅ DEPLOYED.

URL функции:
  $URL

Впиши его в frontend (repo/js/config.js, поле maxEndpoint):
  maxEndpoint: '$URL'

Тест:
  curl -X POST '$URL' \\
    -H 'Origin: https://pizza.lovii.ru' \\
    -H 'Content-Type: application/json' \\
    -d '{"text":"<b>тест</b>","format":"html"}'
EOF
