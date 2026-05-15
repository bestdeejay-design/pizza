package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

const (
	maxAPIBase   = "https://platform-api.max.ru"
	maxTextLen   = 4096
	rateLimitMax = 30
	rateWindow   = 1 * time.Minute
)

// MSK = UTC+3 без перехода на летнее время.
var mskLocation = time.FixedZone("MSK", 3*60*60)

// logf пишет в stdout с newline. YCF Go runtime захватывает stdout
// (через fmt.Print*) в Cloud Logging; стандартный пакет log пишет в stderr,
// и логи могут не попадать туда же.
func logf(format string, args ...any) {
	fmt.Printf(format+"\n", args...)
}

var allowedOrigins = map[string]bool{
	"https://pizza.lovii.ru": true,
	"http://localhost:3000":  true,
	"http://localhost:5173":  true,
	"http://localhost:8080":  true,
	"http://127.0.0.1:3000":  true,
	"http://127.0.0.1:5173":  true,
	"http://127.0.0.1:8080":  true,
}

var allowedFormats = map[string]bool{
	"":         true, // default → html
	"html":     true,
	"markdown": true,
}

// ============================================================================
// Frontend → Function: создание заказа
// ============================================================================

type sendRequest struct {
	Text   string `json:"text"`
	Format string `json:"format"`
}

// ============================================================================
// Max → Function: callback от inline keyboard.
// Схема — из официального SDK https://github.com/max-messenger/max-bot-api-client-ts
// ============================================================================

type maxUser struct {
	UserID   int64   `json:"user_id"`
	Name     string  `json:"name"`
	Username *string `json:"username"`
}

type maxAttachment struct {
	Type    string         `json:"type"`
	Payload map[string]any `json:"payload"`
}

type maxMessageBody struct {
	MID         string          `json:"mid"`
	Text        string          `json:"text"`
	Attachments []maxAttachment `json:"attachments"`
}

type maxMessage struct {
	Body maxMessageBody `json:"body"`
}

type callbackUpdate struct {
	UpdateType string `json:"update_type"`
	Callback   struct {
		CallbackID string  `json:"callback_id"`
		Payload    string  `json:"payload"`
		User       maxUser `json:"user"`
	} `json:"callback"`
	Message *maxMessage `json:"message"`
}

// ============================================================================
// State machine. State не хранится — он "живёт" в самом сообщении (текст +
// текущая клавиатура), callback приходит с этим сообщением.
// ============================================================================

type action string

const (
	actionTake    action = "take"    // created → in_progress
	actionDeliver action = "deliver" // in_progress → on_delivery
	actionDone    action = "done"    // on_delivery → completed
	actionCancel  action = "cancel"  // any → cancelled
)

func validAction(a action) bool {
	return a == actionTake || a == actionDeliver || a == actionDone || a == actionCancel
}

// keyboardForState возвращает клавиатуру для следующего шага после `s`.
// "" = только что созданный заказ.
// done/cancel = терминал, nil = без клавиатуры.
// 1 кнопка в ряд (вертикальная компоновка).
func keyboardForState(s action) []maxAttachment {
	var buttons [][]map[string]any
	switch s {
	case "":
		buttons = [][]map[string]any{
			{{"type": "callback", "text": "👨‍🍳 Взять в работу", "payload": string(actionTake), "intent": "positive"}},
			{{"type": "callback", "text": "❌ Отменить", "payload": string(actionCancel), "intent": "negative"}},
		}
	case actionTake:
		buttons = [][]map[string]any{
			{{"type": "callback", "text": "🚚 Передать в доставку", "payload": string(actionDeliver), "intent": "positive"}},
			{{"type": "callback", "text": "❌ Отменить", "payload": string(actionCancel), "intent": "negative"}},
		}
	case actionDeliver:
		buttons = [][]map[string]any{
			{{"type": "callback", "text": "✅ Закрыть заказ", "payload": string(actionDone), "intent": "positive"}},
			{{"type": "callback", "text": "❌ Отменить", "payload": string(actionCancel), "intent": "negative"}},
		}
	default:
		return nil
	}
	return []maxAttachment{{
		Type:    "inline_keyboard",
		Payload: map[string]any{"buttons": buttons},
	}}
}

func trackingLine(a action, u maxUser, ts time.Time) string {
	who := formatUser(u)
	stamp := ts.In(mskLocation).Format("02.01 15:04")
	switch a {
	case actionTake:
		return fmt.Sprintf("👨‍🍳 Взято в работу: %s (%s)", who, stamp)
	case actionDeliver:
		return fmt.Sprintf("🚚 На доставке: %s (%s)", who, stamp)
	case actionDone:
		return fmt.Sprintf("✅ Завершено: %s (%s)", who, stamp)
	case actionCancel:
		return fmt.Sprintf("❌ Отменено: %s (%s)", who, stamp)
	}
	return ""
}

func formatUser(u maxUser) string {
	name := html.EscapeString(u.Name)
	if u.Username != nil && *u.Username != "" {
		return fmt.Sprintf(`<a href="https://max.ru/%s">%s</a>`, html.EscapeString(*u.Username), name)
	}
	return name
}

func notificationFor(a action) string {
	switch a {
	case actionTake:
		return "Заказ взят в работу"
	case actionDeliver:
		return "Заказ передан в доставку"
	case actionDone:
		return "Заказ завершён"
	case actionCancel:
		return "Заказ отменён"
	}
	return ""
}

// ============================================================================
// Rate limiter (per-instance, sliding window)
// ============================================================================

var (
	rlMu         sync.Mutex
	rlTimestamps []time.Time
)

func rateLimitOK(now time.Time) bool {
	rlMu.Lock()
	defer rlMu.Unlock()
	cutoff := now.Add(-rateWindow)
	kept := rlTimestamps[:0]
	for _, t := range rlTimestamps {
		if t.After(cutoff) {
			kept = append(kept, t)
		}
	}
	rlTimestamps = kept
	if len(rlTimestamps) >= rateLimitMax {
		return false
	}
	rlTimestamps = append(rlTimestamps, now)
	return true
}

// ============================================================================
// HTTP helpers
// ============================================================================

func setCORS(w http.ResponseWriter, origin string) {
	if allowedOrigins[origin] {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Vary", "Origin")
	}
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

// ============================================================================
// Max API client
// ============================================================================

func sendMessage(r *http.Request, token, chatID, text, format string, attachments []maxAttachment) error {
	body := map[string]any{"text": text, "format": format}
	if attachments != nil {
		body["attachments"] = attachments
	}
	endpoint := maxAPIBase + "/messages?chat_id=" + url.QueryEscape(chatID)
	return doMaxRequest(r, http.MethodPost, endpoint, token, body)
}

func editMessage(r *http.Request, token, messageID, text, format string, attachments []maxAttachment) error {
	body := map[string]any{"text": text, "format": format}
	if attachments != nil {
		body["attachments"] = attachments
	} else {
		// Явно пустой массив → убрать клавиатуру (терминальное состояние).
		body["attachments"] = []any{}
	}
	endpoint := maxAPIBase + "/messages?message_id=" + url.QueryEscape(messageID)
	return doMaxRequest(r, http.MethodPut, endpoint, token, body)
}

func answerCallback(r *http.Request, token, callbackID, notification string) {
	body := map[string]any{}
	if notification != "" {
		body["notification"] = notification
	}
	endpoint := maxAPIBase + "/answers?callback_id=" + url.QueryEscape(callbackID)
	if err := doMaxRequest(r, http.MethodPost, endpoint, token, body); err != nil {
		logf("answerCallback failed: %v", err)
	}
}

func doMaxRequest(r *http.Request, method, endpoint, token string, body any) error {
	bodyBytes, _ := json.Marshal(body)
	logf("maxAPI %s %s reqBody=%s", method, endpoint, string(bodyBytes))
	req, _ := http.NewRequestWithContext(r.Context(), method, endpoint, bytes.NewReader(bodyBytes))
	req.Header.Set("Authorization", token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)
	logf("maxAPI %s %s status=%d respBody=%s", method, endpoint, resp.StatusCode, string(respBody))
	if resp.StatusCode >= 400 {
		return fmt.Errorf("status %d: %s", resp.StatusCode, string(respBody))
	}
	return nil
}

// ============================================================================
// Main handler — два пути по заголовку X-Max-Bot-Api-Secret
// ============================================================================

func Handler(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")
	hasSecret := r.Header.Get("X-Max-Bot-Api-Secret") != ""
	logf("Handler: method=%s origin=%q hasMaxSecret=%t userAgent=%q",
		r.Method, origin, hasSecret, r.Header.Get("User-Agent"))

	setCORS(w, origin)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	if hasSecret {
		handleCallback(w, r)
		return
	}

	handleOrder(w, r, origin)
}

func handleOrder(w http.ResponseWriter, r *http.Request, origin string) {
	if !allowedOrigins[origin] {
		writeJSON(w, http.StatusForbidden, map[string]any{"ok": false, "error": "origin not allowed"})
		return
	}
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"ok": false, "error": "method not allowed"})
		return
	}
	if !rateLimitOK(time.Now()) {
		writeJSON(w, http.StatusTooManyRequests, map[string]any{"ok": false, "error": "rate limit"})
		return
	}

	var req sendRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "invalid json"})
		return
	}
	text := strings.TrimSpace(req.Text)
	if text == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "text required"})
		return
	}
	if len(text) > maxTextLen {
		writeJSON(w, http.StatusRequestEntityTooLarge, map[string]any{"ok": false, "error": fmt.Sprintf("text too long (max %d)", maxTextLen)})
		return
	}
	if !allowedFormats[req.Format] {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "format must be html or markdown"})
		return
	}
	format := req.Format
	if format == "" {
		format = "html"
	}

	token := os.Getenv("MAX_TOKEN")
	chatID := os.Getenv("MAX_CHAT_ID")
	if token == "" || chatID == "" {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"ok": false, "error": "secrets not configured"})
		return
	}

	text += "\n\n───────\n📋 Создан: " + time.Now().In(mskLocation).Format("02.01 15:04")
	attachments := keyboardForState("")

	if err := sendMessage(r, token, chatID, text, format, attachments); err != nil {
		logf("send failed: %v", err)
		writeJSON(w, http.StatusBadGateway, map[string]any{"ok": false, "error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func handleCallback(w http.ResponseWriter, r *http.Request) {
	defer func() {
		if rec := recover(); rec != nil {
			logf("handleCallback PANIC: %v", rec)
			writeJSON(w, http.StatusInternalServerError, map[string]any{"ok": false, "error": "panic"})
		}
	}()

	expected := os.Getenv("MAX_WEBHOOK_SECRET")
	provided := r.Header.Get("X-Max-Bot-Api-Secret")
	logf("handleCallback: expectedLen=%d providedLen=%d match=%t",
		len(expected), len(provided), expected != "" && expected == provided)

	if expected == "" || provided != expected {
		writeJSON(w, http.StatusForbidden, map[string]any{"ok": false, "error": "unauthorized"})
		return
	}
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"ok": false, "error": "method not allowed"})
		return
	}

	rawBody, _ := io.ReadAll(r.Body)
	logf("handleCallback: raw body=%s", string(rawBody))

	var update callbackUpdate
	if err := json.Unmarshal(rawBody, &update); err != nil {
		logf("handleCallback: json decode err=%v", err)
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "invalid json"})
		return
	}

	logf("handleCallback: update_type=%s payload=%q hasMessage=%t user=%s",
		update.UpdateType, update.Callback.Payload, update.Message != nil, update.Callback.User.Name)

	if update.UpdateType != "message_callback" {
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "skipped": update.UpdateType})
		return
	}
	if update.Message == nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "callback without message"})
		return
	}

	a := action(update.Callback.Payload)
	if !validAction(a) {
		logf("handleCallback: unknown action %q", update.Callback.Payload)
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "unknown action: " + update.Callback.Payload})
		return
	}

	token := os.Getenv("MAX_TOKEN")
	logf("handleCallback: tokenLen=%d mid=%q", len(token), update.Message.Body.MID)
	if token == "" {
		logf("handleCallback: MAX_TOKEN env empty!")
		writeJSON(w, http.StatusInternalServerError, map[string]any{"ok": false, "error": "token not configured"})
		return
	}

	// Append-only log: берём текущий текст из callback и добавляем строку.
	newText := update.Message.Body.Text + "\n" + trackingLine(a, update.Callback.User, time.Now())
	newKeyboard := keyboardForState(a)
	logf("handleCallback: calling editMessage textLen=%d kbLen=%d", len(newText), len(newKeyboard))

	if err := editMessage(r, token, update.Message.Body.MID, newText, "html", newKeyboard); err != nil {
		logf("edit failed: %v", err)
		answerCallback(r, token, update.Callback.CallbackID, "Не удалось обновить заказ")
		writeJSON(w, http.StatusBadGateway, map[string]any{"ok": false, "error": err.Error()})
		return
	}
	logf("handleCallback: edit OK, answering callback")

	answerCallback(r, token, update.Callback.CallbackID, notificationFor(a))
	logf("handleCallback: done, returning 200")
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}
