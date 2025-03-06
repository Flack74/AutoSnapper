import React, { useState } from "react";

export default function Autosnapper() {
  const [url, setUrl] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isValidUrl, setIsValidUrl] = useState<boolean>(true);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    setIsValidUrl(isValidHttpUrl(value));
  };

  const handleCapture = async () => {
    if (!isValidUrl || !url) return;

    try {
      setErrorMessage("");
      setScreenshot(null);

      const response = await fetch("http://localhost:8080/api/screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error("Failed to capture screenshot. Check server logs.");
      }

      const data = await response.json();
      setScreenshot(`data:image/png;base64,${data.imageData}`);
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message);
    }
  };

  const isValidHttpUrl = (input: string): boolean => {
    try {
      new URL(input);
      return input.startsWith("http://") || input.startsWith("https://");
    } catch {
      return false;
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        width: "100vw",
        margin: 0,
        padding: 0,
      }}
    >
      <div
        style={{
          width: "90%",
          maxWidth: "400px",
          border: "1px solid #ccc",
          padding: "2rem",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          textAlign: "center",
          backgroundColor: "#1e1e1e",
        }}
      >
        <h2>Autosnapper</h2>
        <p>Enter a URL to capture a screenshot</p>
        <div style={{ width: "100%", marginBottom: "1rem" }}>
          <label htmlFor="url" style={{ display: "block", marginBottom: "0.5rem" }}>
            URL
          </label>
          <input
            id="url"
            value={url}
            onChange={handleUrlChange}
            placeholder="https://example.com"
            style={{
              width: "calc(100% - 12px)", // Adjust for padding and border
              padding: "6px",
              border: isValidUrl ? "1px solid #ccc" : "1px solid red",
              borderRadius: "4px",
            }}
          />
          {!isValidUrl && (
            <p style={{ color: "red", marginTop: "0.5rem" }}>Please enter a valid URL</p>
          )}
        </div>

        <button
          onClick={handleCapture}
          disabled={!isValidUrl || !url}
          style={{
            padding: "8px 16px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Capture Screenshot
        </button>

        {errorMessage && <p style={{ color: "red", marginTop: "1rem" }}>{errorMessage}</p>}

        {screenshot && (
          <div style={{ marginTop: "1.5rem", width: "100%" }}>
            <h3>Captured Screenshot</h3>
            <img
              src={screenshot}
              alt="Captured Screenshot"
              style={{
                maxWidth: "100%",
                maxHeight: "600px", // Limit height if needed
                border: "1px solid #ccc",
                borderRadius: "4px",
                display: "block",
                margin: "0 auto", // Center the image
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}