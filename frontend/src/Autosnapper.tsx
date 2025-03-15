import React, { useState } from "react";

export default function Autosnapper() {
  const [url, setUrl] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isValidUrl, setIsValidUrl] = useState<boolean>(true);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "https://autosnapper.onrender.com";

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

      const response = await fetch(`${backendUrl}/api/screenshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const textResponse = await response.text(); // Get raw response for debugging
      console.log("Raw response:", textResponse);
      
      if (!response.ok) {
        throw new Error(`Server Error: ${textResponse}`);
      }
      
      const data = JSON.parse(textResponse);
      if (!data.imageData) throw new Error("Invalid response from server");
      
      setScreenshot(`data:image/png;base64,${data.imageData}`);
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "An unexpected error occurred.");
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
    <div style={{ textAlign: "center", padding: "2rem", backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      <div style={{ backgroundColor: "#1e1e1e", padding: "2rem", borderRadius: "8px", color: "#fff", maxWidth: "600px", margin: "auto" }}>
        <h2>AutoSnapper</h2>
        <p>Enter a URL to capture a screenshot</p>
        <div>
          <label htmlFor="url" style={{ display: "block", marginBottom: "0.5rem" }}>URL</label>
          <input
            id="url"
            value={url}
            onChange={handleUrlChange}
            placeholder="https://example.com"
            style={{ width: "100%", padding: "0.75rem", fontSize: "1rem", border: isValidUrl ? "1px solid #ccc" : "1px solid red", borderRadius: "4px" }}
          />
          {!isValidUrl && <p style={{ color: "red", marginTop: "0.5rem" }}>Please enter a valid URL</p>}
        </div>
        <button
          onClick={handleCapture}
          disabled={!isValidUrl || !url}
          style={{ marginTop: "1rem", padding: "0.75rem 1.5rem", backgroundColor: !isValidUrl || !url ? "#aaa" : "#007bff", color: "#fff", border: "none", borderRadius: "4px", fontSize: "1rem", cursor: !isValidUrl || !url ? "not-allowed" : "pointer" }}
        >
          Capture Screenshot
        </button>
        {errorMessage && <p style={{ color: "red", marginTop: "1rem" }}>{errorMessage}</p>}
        {screenshot && (
          <div style={{ marginTop: "2rem" }}>
            <h3>Captured Screenshot</h3>
            <img src={screenshot} alt="Captured Screenshot" style={{ width: "100%", border: "1px solid #ccc", borderRadius: "4px", marginTop: "1rem" }} />
          </div>
        )}
      </div>
    </div>
  );
}
