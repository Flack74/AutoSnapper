package main

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/chromedp/chromedp"
	"github.com/redis/go-redis/v9"
	"github.com/sirupsen/logrus"
)

type ScreenshotRequest struct {
	URL string `json:"url"`
}

type ScreenshotResponse struct {
	ImageData string `json:"imageData"`
	Cached    bool   `json:"cached"`
}

type HistoryItem struct {
	URL       string    `json:"url"`
	Timestamp time.Time `json:"timestamp"`
	ImageData string    `json:"imageData"`
}

type HistoryResponse struct {
	History []HistoryItem `json:"history"`
}

type HealthResponse struct {
	Status    string            `json:"status"`
	Timestamp time.Time         `json:"timestamp"`
	Services  map[string]string `json:"services"`
}

var (
	rdb    *redis.Client
	logger *logrus.Logger
)

type filteredWriter struct{}

func (fw *filteredWriter) Write(p []byte) (n int, err error) {
	msg := string(p)
	if strings.Contains(msg, "could not unmarshal event") && strings.Contains(msg, "cookiePart") {
		return len(p), nil
	}
	return os.Stderr.Write(p)
}

func screenshotHandler(w http.ResponseWriter, r *http.Request) {
	start := time.Now()

	corsOrigin := os.Getenv("CORS_ORIGIN")
	if corsOrigin == "" {
		corsOrigin = "*"
	}

	w.Header().Set("Access-Control-Allow-Origin", corsOrigin)
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")

	if r.Method == http.MethodOptions {
		return
	}

	var req ScreenshotRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.WithError(err).Error("Failed to parse JSON request")
		http.Error(w, "Bad request: unable to parse JSON", http.StatusBadRequest)
		return
	}

	if req.URL == "" {
		logger.Warn("Empty URL provided")
		http.Error(w, "No URL provided", http.StatusBadRequest)
		return
	}

	logger.WithField("url", req.URL).Info("Screenshot request received")

	cacheKey := generateCacheKey(req.URL)

	ctx := context.Background()
	if rdb != nil {
		cachedData, err := rdb.Get(ctx, cacheKey).Result()
		if err == nil {
			logger.WithField("url", req.URL).Info("Serving from cache")
			resp := ScreenshotResponse{
				ImageData: cachedData,
				Cached:    true,
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(resp)
			return
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.DisableGPU,
		chromedp.Flag("disable-extensions", true),
		chromedp.Flag("no-sandbox", true),
		chromedp.Flag("headless", true),
		chromedp.Flag("disable-dev-shm-usage", true),
	)

	allocCtx, cancel := chromedp.NewExecAllocator(ctx, opts...)
	defer cancel()

	browserCtx, cancel := chromedp.NewContext(allocCtx)
	defer cancel()

	var imgBytes []byte
	err := chromedp.Run(browserCtx,
		chromedp.Navigate(req.URL),
		chromedp.WaitReady("body", chromedp.ByQuery),
		chromedp.Sleep(2*time.Second),
		chromedp.FullScreenshot(&imgBytes, 90),
	)

	if err != nil {
		logger.WithError(err).WithField("url", req.URL).Error("Failed to capture screenshot")
		http.Error(w, "Failed to capture screenshot", http.StatusInternalServerError)
		return
	}

	encoded := base64.StdEncoding.EncodeToString(imgBytes)

	if rdb != nil {
		rdb.Set(ctx, cacheKey, encoded, time.Hour)
		
		historyItem := HistoryItem{
			URL:       req.URL,
			Timestamp: time.Now(),
			ImageData: encoded,
		}
		historyData, _ := json.Marshal(historyItem)
		rdb.LPush(ctx, "screenshot:history", historyData)
		rdb.LTrim(ctx, "screenshot:history", 0, 9)
	}

	resp := ScreenshotResponse{
		ImageData: encoded,
		Cached:    false,
	}

	duration := time.Since(start)
	logger.WithFields(logrus.Fields{
		"url":      req.URL,
		"duration": duration,
		"cached":   false,
	}).Info("Screenshot captured successfully")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func generateCacheKey(url string) string {
	hash := sha256.Sum256([]byte(url))
	return "screenshot:" + hex.EncodeToString(hash[:])
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	services := make(map[string]string)
	services["application"] = "healthy"

	if rdb != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		_, err := rdb.Ping(ctx).Result()
		if err != nil {
			services["redis"] = "unhealthy"
		} else {
			services["redis"] = "healthy"
		}
	} else {
		services["redis"] = "disabled"
	}

	health := HealthResponse{
		Status:    "healthy",
		Timestamp: time.Now(),
		Services:  services,
	}

	json.NewEncoder(w).Encode(health)
}

func initRedis() {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		logger.Info("Redis not configured, running without cache")
		return
	}

	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		logger.WithError(err).Error("Failed to parse Redis URL")
		return
	}

	rdb = redis.NewClient(opt)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = rdb.Ping(ctx).Result()
	if err != nil {
		logger.WithError(err).Error("Failed to connect to Redis")
		rdb = nil
		return
	}

	logger.Info("Redis connected successfully")
}

func initLogger() {
	logger = logrus.New()
	logger.SetFormatter(&logrus.JSONFormatter{})

	level := os.Getenv("LOG_LEVEL")
	switch level {
	case "debug":
		logger.SetLevel(logrus.DebugLevel)
	case "warn":
		logger.SetLevel(logrus.WarnLevel)
	case "error":
		logger.SetLevel(logrus.ErrorLevel)
	default:
		logger.SetLevel(logrus.InfoLevel)
	}
}

func historyHandler(w http.ResponseWriter, r *http.Request) {
	corsOrigin := os.Getenv("CORS_ORIGIN")
	if corsOrigin == "" {
		corsOrigin = "*"
	}

	w.Header().Set("Access-Control-Allow-Origin", corsOrigin)
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")

	if r.Method == http.MethodOptions {
		return
	}

	logger.Info("History request received")
	ctx := context.Background()
	var history []HistoryItem

	if rdb != nil {
		historyData, err := rdb.LRange(ctx, "screenshot:history", 0, 2).Result()
		if err == nil {
			for _, data := range historyData {
				var item HistoryItem
				if json.Unmarshal([]byte(data), &item) == nil {
					history = append(history, item)
				}
			}
		}
	}

	resp := HistoryResponse{History: history}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func rootHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`<!DOCTYPE html>
<html>
<head>
    <title>AutoSnapper Backend</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f8f9fa; text-align: center; padding-top: 50px; }
        h1 { color: #333; }
        p { color: #555; }
    </style>
</head>
<body>
    <h1>AutoSnapper Backend is Live!</h1>
    <p>Use the <code>/api/screenshot</code> endpoint to capture screenshots.</p>
</body>
</html>`))
}

func main() {
	log.SetOutput(&filteredWriter{})
	initLogger()
	initRedis()

	http.HandleFunc("/", rootHandler)
	http.HandleFunc("/api/screenshot", screenshotHandler)
	http.HandleFunc("/api/history", historyHandler)
	http.HandleFunc("/health", healthHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	logger.WithField("port", port).Info("Starting AutoSnapper server")
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		logger.WithError(err).Fatal("Server failed to start")
	}
}
