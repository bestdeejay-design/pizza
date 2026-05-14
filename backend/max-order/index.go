package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

const (
	maxAPIURL    = "https://platform-api.max.ru/messages"
	maxTextLen   = 4096
	rateLimitMax = 30              // requests per window
	rateWindow   = 1 * time.Minute // sliding window
)

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

type sendRequest struct {
	Text   string `json:"text"`
	Format string `json:"format"`
}

// In-memory sliding-window rate limiter (per-instance, resets on cold start).
var (
	rlMu        sync.Mutex
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

func Handler(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")
	setCORS(w, origin)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
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

	bodyBytes, _ := json.Marshal(map[string]string{"text": text, "format": format})
	endpoint := maxAPIURL + "?chat_id=" + url.QueryEscape(chatID)

	maxReq, _ := http.NewRequestWithContext(r.Context(), http.MethodPost, endpoint, bytes.NewReader(bodyBytes))
	maxReq.Header.Set("Authorization", token)
	maxReq.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(maxReq)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"ok": false, "error": err.Error()})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		log.Printf("max api error: status=%d body=%s", resp.StatusCode, string(respBody))
		writeJSON(w, http.StatusBadGateway, map[string]any{"ok": false, "error": fmt.Sprintf("max api status %d: %s", resp.StatusCode, string(respBody))})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}
