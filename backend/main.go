package main

import (
	"encoding/base64"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/proto"
)

// Structs for request & response
type ScreenshotRequest struct {
	URL string `json:"url"`
}

type ScreenshotResponse struct {
	ImageData string `json:"imageData"`
}

// Global browser instance (singleton)
var browser *rod.Browser
var once sync.Once

// Initialize browser with optimized settings
func getBrowser() *rod.Browser {
	once.Do(func() {
		os.Setenv("ROD_BROWSER_BIN", "/usr/bin/google-chrome") // Ensure Chrome is found
		browser = rod.New().ControlURL("ws://127.0.0.1:9222").MustConnect()
	})
	return browser
}

// Screenshot handler
func screenshotHandler(w http.ResponseWriter, r *http.Request) {
	// CORS Headers
	w.Header().Set("Access-Control-Allow-Origin", "https://autosnapper-1.onrender.com")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	// Parse JSON request
	var req ScreenshotRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request: unable to parse JSON", http.StatusBadRequest)
		return
	}

	if req.URL == "" {
		http.Error(w, "No URL provided", http.StatusBadRequest)
		return
	}

	// Use singleton browser instance
	browser := getBrowser()

	// Open page with timeout (avoids memory leaks)
	page, err := browser.Page(proto.TargetCreateTarget{URL: req.URL})
	if err != nil {
		http.Error(w, "Failed to load page", http.StatusInternalServerError)
		return
	}
	defer page.Close()

	page.Timeout(10 * time.Second).MustWaitLoad() // Wait with timeout

	// Capture optimized screenshot (JPEG, lower quality)
	imgBytes, err := page.Screenshot(false, &proto.PageCaptureScreenshot{
		Format:  proto.PageCaptureScreenshotFormatJpeg, // Use JPEG for lower memory usage
		Quality: proto.Int64(70),                        // Use Int64 instead of Int
	})
	if err != nil {
		http.Error(w, "Failed to capture screenshot", http.StatusInternalServerError)
		return
	}

	encoded := base64.StdEncoding.EncodeToString(imgBytes)
	resp := ScreenshotResponse{ImageData: encoded}

	// Return JSON response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// Root handler
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

// Main function
func main() {
	// Start headless Chrome in background (low-memory mode)
	go func() {
		log.Println("Launching Chrome...")
		os.Setenv("ROD_HEADLESS", "1")
		os.Setenv("ROD_DEVTOOLS", "false")
		getBrowser()
	}()

	// HTTP Handlers
	http.HandleFunc("/", rootHandler)
	http.HandleFunc("/api/screenshot", screenshotHandler)

	// Bind to port from environment variable, default to 8080
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Println("Server is running on port:", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
