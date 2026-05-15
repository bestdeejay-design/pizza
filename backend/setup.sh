#!/bin/bash
# Одноразовый bootstrap: Service Account + Lockbox secret + права.
# Запусти один раз. После успеха — заполни backend/.env реальными значениями
# и положи настоящий MAX токен в Lockbox через команду из вывода.

set -euo pipefail
cd "$(dirname "$0")"

[[ -f .env ]] && set -a && source .env && set +a

SA_NAME="${SA_NAME:-pizza-max-fn-sa}"
SECRET_NAME="${SECRET_NAME:-pizza-max-bot}"
FOLDER_ID="${FOLDER_ID:-$(yc config get folder-id)}"

echo "Folder:  $FOLDER_ID"
echo "SA:      $SA_NAME"
echo "Secret:  $SECRET_NAME"
echo

echo "==> Service Account"
yc iam service-account create --name "$SA_NAME" \
  --description "Runs pizza Max bot function" 2>&1 | grep -v "already exists" || true
SA_ID=$(yc iam service-account get "$SA_NAME" --format json | jq -r .id)
echo "    SA_ID=$SA_ID"

echo "==> Lockbox secret (placeholder values, replace later)"
yc lockbox secret create --name "$SECRET_NAME" \
  --description "Max bot token + chat_id + webhook_secret для pizza" \
  --payload '[{"key":"token","text_value":"REPLACE_ME"},{"key":"chat_id","text_value":"REPLACE_ME"},{"key":"webhook_secret","text_value":"REPLACE_ME"}]' \
  2>&1 | grep -v "already exists" || true
SECRET_ID=$(yc lockbox secret get "$SECRET_NAME" --format json | jq -r .id)
echo "    SECRET_ID=$SECRET_ID"

echo "==> Grant SA read access to this secret only"
yc lockbox secret add-access-binding "$SECRET_NAME" \
  --role lockbox.payloadViewer \
  --service-account-id "$SA_ID" 2>&1 | grep -v "already exists" || true

cat <<EOF

✅ SETUP DONE.

1) Сохрани в backend/.env (скопируй из .env.example, если ещё нет):
   FOLDER_ID=$FOLDER_ID
   SA_NAME=$SA_NAME
   SA_ID=$SA_ID
   SECRET_NAME=$SECRET_NAME
   SECRET_ID=$SECRET_ID

2) Сгенерируй webhook secret:
   openssl rand -hex 32

3) Положи токен, chat_id и webhook_secret в Lockbox (новая активная версия):
   yc lockbox secret add-version $SECRET_NAME --payload '[
     {"key":"token","text_value":"<MAX_BOT_ТОКЕН>"},
     {"key":"chat_id","text_value":"<CHAT_ID>"},
     {"key":"webhook_secret","text_value":"<СЕКРЕТ_ИЗ_OPENSSL>"}
   ]'

4) Запусти ./deploy.sh — задеплоит функцию.

5) Запусти ./subscribe.sh — подпишет функцию на callback'и от Max.
EOF
