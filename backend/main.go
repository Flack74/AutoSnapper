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
	// Set CORS headers if needed
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	if r.Method == http.MethodOptions {
		return
	}

	var req ScreenshotRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request: unable to parse JSON", http.StatusBadRequest)
		return
	}

	if req.URL == "" {
		http.Error(w, "No URL provided", http.StatusBadRequest)
		return
	}

	browser := rod.New().MustConnect()
	defer browser.MustClose()

	page := browser.MustPage(req.URL).MustWaitLoad()

	imgBytes, err := page.Screenshot(true, &proto.PageCaptureScreenshot{})
	if err != nil {
		http.Error(w, "Failed to capture screenshot", http.StatusInternalServerError)
		return
	}

	encoded := base64.StdEncoding.EncodeToString(imgBytes)
	resp := ScreenshotResponse{ImageData: encoded}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func main() {
	http.HandleFunc("/api/screenshot", screenshotHandler)
	
	// Read PORT from environment, default to 8080 for local development.
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Println("Server is running on port:", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
