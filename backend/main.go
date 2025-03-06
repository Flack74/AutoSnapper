// package main

// import (
// 	"log"

// 	"github.com/go-rod/rod"
// )

// func main() {
// 	// Connect to the default browser instance.
// 	browser := rod.New().MustConnect()

// 	// Open a new page with the target URL.
// 	page := browser.MustPage("https://watchwrestling.ae")

// 	// Wait until the page is fully loaded.
// 	page.MustWaitLoad()

// 	// Capture a screenshot of the page and save it as "example.png".
// 	err := page.MustScreenshot("watchwrestling.png")
// 	if err != nil {
// 		log.Fatal(err)
// 	}

// 	log.Println("Screenshot saved as youtubewatchwrestling.png")
// }

package main

import (
	"encoding/base64"
	"encoding/json"
	"log"
	"net/http"

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
	// --- ADD THESE LINES FOR CORS ---
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")

	if r.Method == http.MethodOptions {
		// Preflight request; nothing else to do
		return
	}
	// --------------------------------

	// Parse JSON from request body
	var req ScreenshotRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request: unable to parse JSON", http.StatusBadRequest)
		return
	}

	if req.URL == "" {
		http.Error(w, "No URL provided", http.StatusBadRequest)
		return
	}

	// Use Rod to capture the screenshot
	browser := rod.New().MustConnect()
	defer browser.MustClose()

	page := browser.MustPage(req.URL).MustWaitLoad()

	// Capture a full-page screenshot
	imgBytes, err := page.Screenshot(true, &proto.PageCaptureScreenshot{})
	if err != nil {
		http.Error(w, "Failed to capture screenshot", http.StatusInternalServerError)
		return
	}

	// Encode screenshot bytes to base64
	encoded := base64.StdEncoding.EncodeToString(imgBytes)
	resp := ScreenshotResponse{ImageData: encoded}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func main() {
	http.HandleFunc("/api/screenshot", screenshotHandler)

	log.Println("Server is running on http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
