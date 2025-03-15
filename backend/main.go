package main

import (
	"encoding/base64"
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/proto"
)

type ScreenshotRequest struct {
	URL string `json:"url"`
}

type ScreenshotResponse struct {
	ImageData string `json:"imageData"`
}

func screenshotHandler(w http.ResponseWriter, r *http.Request) {
	// CORS Headers
	w.Header().Set("Access-Control-Allow-Origin", "https://autosnapper-1.onrender.com") // Allow only your frontend
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		return
	}

	// Parse JSON request
	var req ScreenshotRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Println("Error decoding JSON:", err)
		http.Error(w, "Bad request: unable to parse JSON", http.StatusBadRequest)
		return
	}

	if req.URL == "" {
		http.Error(w, "No URL provided", http.StatusBadRequest)
		return
	}

	// Use Rod to capture the screenshot
	os.Setenv("ROD_BROWSER_BIN", "/usr/bin/google-chrome") // Ensure Chrome is found
	browser := rod.New().MustConnect()
	defer browser.MustClose()

	page, err := browser.Page(proto.TargetCreateTarget{URL: req.URL})
	if err != nil {
		log.Println("Failed to load page:", err)
		http.Error(w, "Failed to load page", http.StatusInternalServerError)
		return
	}
	page.MustWaitLoad()

	imgBytes, err := page.Screenshot(true, &proto.PageCaptureScreenshot{})
	if err != nil {
		log.Println("Screenshot error:", err)
		http.Error(w, "Failed to capture screenshot", http.StatusInternalServerError)
		return
	}

	encoded := base64.StdEncoding.EncodeToString(imgBytes)
	resp := ScreenshotResponse{ImageData: encoded}

	// Return JSON response
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
