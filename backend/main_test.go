package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealthHandler(t *testing.T) {
	initLogger()
	
	req, err := http.NewRequest("GET", "/health", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(healthHandler)
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	var health HealthResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &health); err != nil {
		t.Errorf("Failed to parse health response: %v", err)
	}

	if health.Status != "healthy" {
		t.Errorf("Expected status 'healthy', got '%s'", health.Status)
	}
}

func TestScreenshotHandlerBadRequest(t *testing.T) {
	initLogger()
	
	// Test with empty body
	req, err := http.NewRequest("POST", "/api/screenshot", bytes.NewBuffer([]byte("{}")))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(screenshotHandler)
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusBadRequest {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusBadRequest)
	}
}

func TestGenerateCacheKey(t *testing.T) {
	url1 := "https://example.com"
	url2 := "https://google.com"
	
	key1 := generateCacheKey(url1)
	key2 := generateCacheKey(url2)
	
	if key1 == key2 {
		t.Error("Different URLs should generate different cache keys")
	}
	
	if key1 != generateCacheKey(url1) {
		t.Error("Same URL should generate same cache key")
	}
}

func TestHistoryHandler(t *testing.T) {
	initLogger()
	
	req, err := http.NewRequest("GET", "/api/history", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(historyHandler)
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	var historyResp HistoryResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &historyResp); err != nil {
		t.Errorf("Failed to parse history response: %v", err)
	}
}

func TestRootHandler(t *testing.T) {
	req, err := http.NewRequest("GET", "/", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(rootHandler)
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	if !bytes.Contains(rr.Body.Bytes(), []byte("AutoSnapper Backend is Live!")) {
		t.Error("Response should contain expected title")
	}
}