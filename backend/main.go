package main

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"os"
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

func screenshotHandler(w http.ResponseWriter, r *http.Request) {
	start := time.Now()

	// Get CORS origin from environment or default to *
	corsOrigin := os.Getenv("CORS_ORIGIN")
	if corsOrigin == "" {
		corsOrigin = "*"
	}

	// CORS headers for cross-domain requests
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

	// Generate cache key
	cacheKey := generateCacheKey(req.URL)

	// Check Redis cache first
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

	// Create a timeout context for the screenshot operation
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Setup chromedp with memory-optimized options
	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.DisableGPU,
		chromedp.Flag("disable-extensions", true),
		chromedp.Flag("disable-sync", true),
		chromedp.Flag("disable-background-networking", true),
		chromedp.Flag("disable-default-apps", true),
		chromedp.Flag("disable-translate", true),
		chromedp.Flag("disable-notifications", true),
		chromedp.Flag("disable-background-timer-throttling", true),
		chromedp.Flag("disable-site-isolation-trials", true),
		chromedp.Flag("disable-features", "site-per-process,TranslateUI"),
		chromedp.Flag("disable-hang-monitor", true),
		chromedp.Flag("disable-ipc-flooding-protection", true),
		chromedp.Flag("disable-client-side-phishing-detection", true),
		chromedp.Flag("disable-popup-blocking", true),
		chromedp.Flag("disable-prompt-on-repost", true),
		chromedp.Flag("disable-domain-reliability", true),
		chromedp.Flag("disable-print-preview", true),
		chromedp.Flag("disable-speech-api", true),
		chromedp.Flag("disable-breakpad", true),
		chromedp.Flag("disable-backing-store-limit", true),
		chromedp.Flag("no-sandbox", true),
		chromedp.Flag("headless", true),
		chromedp.Flag("hide-scrollbars", true),
		chromedp.Flag("mute-audio", true),
		chromedp.Flag("window-size", "1280,1024"),
		chromedp.Flag("disable-dev-shm-usage", true),
	)

	allocCtx, cancel := chromedp.NewExecAllocator(ctx, opts...)
	defer cancel()

	// Create a new browser context
	browserCtx, cancel := chromedp.NewContext(allocCtx, chromedp.WithLogf(logger.Debugf))
	defer cancel()

	// Capture screenshot
	var imgBytes []byte
	err := chromedp.Run(browserCtx,
		chromedp.Navigate(req.URL),
		chromedp.WaitReady("body", chromedp.ByQuery),
		chromedp.Sleep(2*time.Second), // Give page time to render
		chromedp.FullScreenshot(&imgBytes, 90),
	)

	if err != nil {
		logger.WithError(err).WithField("url", req.URL).Error("Failed to capture screenshot")
		http.Error(w, "Failed to capture screenshot", http.StatusInternalServerError)
		return
	}

	encoded := base64.StdEncoding.EncodeToString(imgBytes)

	// Cache the result for 1 hour
	if rdb != nil {
		err = rdb.Set(ctx, cacheKey, encoded, time.Hour).Err()
		if err != nil {
			logger.WithError(err).Warn("Failed to cache screenshot")
		}
		
		// Store in history (keep last 10 items)
		historyItem := HistoryItem{
			URL:       req.URL,
			Timestamp: time.Now(),
			ImageData: encoded,
		}
		historyData, err := json.Marshal(historyItem)
		if err != nil {
			logger.WithError(err).Error("Failed to marshal history item")
		} else {
			// Add to history list and trim to last 10
			err = rdb.LPush(ctx, "screenshot:history", historyData).Err()
			if err != nil {
				logger.WithError(err).Error("Failed to store history item")
			} else {
				rdb.LTrim(ctx, "screenshot:history", 0, 9)
				logger.WithField("url", req.URL).Info("Screenshot stored in history")
			}
		}
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

	// Check Redis connection
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

	// Test connection
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
	// Get CORS origin from environment or default to *
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
		if err != nil {
			logger.WithError(err).Error("Failed to fetch history from Redis")
		} else {
			logger.WithField("count", len(historyData)).Info("Retrieved history items from Redis")
			for _, data := range historyData {
				var item HistoryItem
				if json.Unmarshal([]byte(data), &item) == nil {
					history = append(history, item)
				} else {
					logger.Error("Failed to unmarshal history item")
				}
			}
		}
	} else {
		logger.Warn("Redis not available for history")
	}

	resp := HistoryResponse{History: history}
	logger.WithField("historyCount", len(history)).Info("Sending history response")
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func rootHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`
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
    </html>
  `))
}

func main() {
	// Initialize logger and Redis
	initLogger()
	initRedis()

	http.HandleFunc("/", rootHandler)
	http.HandleFunc("/api/screenshot", screenshotHandler)
	http.HandleFunc("/api/history", historyHandler)
	http.HandleFunc("/health", healthHandler)

	// Bind to the port from the PORT environment variable; default to 8080
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	logger.WithField("port", port).Info("Starting AutoSnapper server")
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		logger.WithError(err).Fatal("Server failed to start")
	}
}
