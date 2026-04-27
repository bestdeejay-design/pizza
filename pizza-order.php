<?php
/**
 * pizza-order.php — прокси для отправки заказов в Telegram-канал.
 *
 * Деплой: положить файл на https://api.mobiap.com/pizza-order.php
 * Требует: PHP 7.2+, расширения curl и mbstring.
 *
 * Принимает POST application/json вида:
 * {
 *   "tableNumber": "5",
 *   "comment": "без лука",
 *   "items": [
 *     { "title": "Маргарита", "price": 650, "quantity": 2, "category": "pizza-30cm" },
 *     ...
 *   ]
 * }
 *
 * Возвращает JSON:
 *   успех:  { "ok": true,  "message_id": 123 }
 *   ошибка: { "ok": false, "error": "описание", "details": "..." }   (HTTP 4xx/5xx)
 *
 * Диагностика: GET ?diag=1 — пробует достучаться до Telegram и
 * возвращает HTTP-код, curl-errno, текст ошибки и тело ответа.
 */

// ====== CONFIG ======
const TELEGRAM_BOT_TOKEN = '***REVOKED***';
const TELEGRAM_CHAT_ID   = '-1003969075203';

// CORS: укажи точный origin фронта вместо '*' для пущей строгости.
const ALLOWED_ORIGIN = '*';

// Таймзона для штампа времени в сообщении
const TIMEZONE = 'Europe/Moscow';

// Лимиты на входящие данные
const MAX_ITEMS       = 50;
const MAX_TITLE_LEN   = 200;
const MAX_COMMENT_LEN = 500;
const MAX_TABLE_LEN   = 10;

// Не мешаем JSON-ответу любыми PHP-предупреждениями: пишем их в лог, не в тело
ini_set('display_errors', '0');
ini_set('html_errors', '0');
error_reporting(E_ALL);

// ====== HEADERS ======
header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGIN);
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ====== DIAGNOSTIC MODE ======
// GET ?diag=1 — тестовый вызов Telegram getMe.
// Если хостер режет исходящий, тут будет видно точный curl-errno/error.
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['diag'])) {
    $ch = curl_init('https://api.telegram.org/bot' . TELEGRAM_BOT_TOKEN . '/getMe');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT        => 10,
    ]);
    $body = curl_exec($ch);
    $diag = [
        'http_code'  => curl_getinfo($ch, CURLINFO_HTTP_CODE),
        'curl_errno' => curl_errno($ch),
        'curl_error' => curl_error($ch),
        'body'       => $body === false ? null : substr($body, 0, 500),
        'php'        => PHP_VERSION,
        'curl'       => curl_version()['version'] ?? null,
    ];
    echo json_encode($diag, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

// ====== INPUT ======
$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);

if (!is_array($body)) {
    fail(400, 'Invalid JSON');
}

$tableNumber = trim((string)($body['tableNumber'] ?? ''));
$comment     = trim((string)($body['comment'] ?? ''));
$items       = $body['items'] ?? null;

if ($tableNumber === '' || mb_strlen($tableNumber) > MAX_TABLE_LEN) {
    fail(400, 'Не указан номер столика');
}
if (!is_array($items) || count($items) === 0) {
    fail(400, 'Корзина пуста');
}
if (count($items) > MAX_ITEMS) {
    fail(400, 'Слишком много позиций');
}
if (mb_strlen($comment) > MAX_COMMENT_LEN) {
    fail(400, 'Слишком длинный комментарий');
}

// ====== FORMAT MESSAGE ======
$CATEGORY_EMOJI = [
    'pizza-30cm'              => '🍕',
    'piccolo-20cm'            => '🍕',
    'calzone'                 => '🥟',
    'bread-focaccia-bread'    => '🍞',
    'bread-focaccia-focaccia' => '🥖',
    'sauce'                   => '🥫',
    'rolls-sushi'             => '🍣',
    'rolls-rolls'             => '🍣',
    'combo'                   => '🍱',
    'confectionery'           => '🍰',
    'mors'                    => '🥤',
    'juice'                   => '🧃',
    'water'                   => '💧',
    'soda'                    => '🥤',
    'beverages-other'         => '🥤',
    'frozen'                  => '❄️',
    'aromatic-oils'           => '🫒',
    'masterclass'             => '🎓',
    'franchise'               => '💼',
];

date_default_timezone_set(TIMEZONE);
$stamp = date('d.m, H:i');

$totalSum    = 0;
$totalPieces = 0;

$lines = [
    '🍕 <b>НОВЫЙ ЗАКАЗ</b>',
    '🪑 Стол: <b>№' . esc($tableNumber) . '</b>',
    '🕑 ' . esc($stamp),
    '',
    '━━━━━━━━━━━━━━━',
    '📋 <b>СОСТАВ ЗАКАЗА</b>',
    '',
];

foreach ($items as $idx => $item) {
    if (!is_array($item)) {
        fail(400, 'Некорректная позиция в заказе');
    }
    $title    = mb_substr(trim((string)($item['title']    ?? '???')), 0, MAX_TITLE_LEN);
    $price    = max(0,   (int)($item['price']    ?? 0));
    $quantity = max(1, min(999, (int)($item['quantity'] ?? 1)));
    $category = (string)($item['category'] ?? '');
    $emoji    = $CATEGORY_EMOJI[$category] ?? '•';

    $lineSum      = $price * $quantity;
    $totalSum    += $lineSum;
    $totalPieces += $quantity;

    $lines[] = ($idx + 1) . '. ' . $emoji . ' ' . esc($title);
    $lines[] = '    ' . $quantity . ' × ' . $price . ' ₽ = <b>' . $lineSum . ' ₽</b>';
    $lines[] = '';
}

$lines[] = '━━━━━━━━━━━━━━━';
$lines[] = '🛒 Позиций: ' . count($items) . ' (всего ' . $totalPieces . ' шт.)';
$lines[] = '💰 <b>ИТОГО: ' . $totalSum . ' ₽</b>';

if ($comment !== '') {
    $lines[] = '';
    $lines[] = '💬 <b>Комментарий:</b>';
    $lines[] = esc($comment);
}

$text = implode("\n", $lines);

// ====== SEND TO TELEGRAM ======
$payload = json_encode([
    'chat_id'                  => TELEGRAM_CHAT_ID,
    'text'                     => $text,
    'parse_mode'               => 'HTML',
    'disable_web_page_preview' => true,
], JSON_UNESCAPED_UNICODE);

$ch = curl_init('https://api.telegram.org/bot' . TELEGRAM_BOT_TOKEN . '/sendMessage');
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_TIMEOUT        => 10,
]);
$response  = curl_exec($ch);
$curlErr   = curl_error($ch);
$curlErrNo = curl_errno($ch);

if ($response === false) {
    error_log('pizza-order: curl error #' . $curlErrNo . ': ' . $curlErr);
    fail(502, 'Ошибка соединения с Telegram', $curlErr ?: ('errno ' . $curlErrNo));
}

$data = json_decode($response, true);
if (!is_array($data) || empty($data['ok'])) {
    error_log('pizza-order: telegram error: ' . $response);
    $desc = is_array($data) && isset($data['description']) ? $data['description'] : 'Telegram error';
    fail(502, 'Telegram: ' . $desc, substr($response, 0, 300));
}

echo json_encode([
    'ok'         => true,
    'message_id' => $data['result']['message_id'] ?? null,
]);


// ====== HELPERS ======
function esc($s) {
    return htmlspecialchars((string)$s, ENT_NOQUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function fail($code, $msg, $details = null) {
    http_response_code($code);
    $payload = ['ok' => false, 'error' => $msg];
    if ($details !== null && $details !== '') {
        $payload['details'] = $details;
    }
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}
