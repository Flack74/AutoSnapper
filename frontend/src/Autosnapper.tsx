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

      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";
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

  // ----------- Styles -----------
  // Page: full viewport, light background, centered content.
  const pageStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    width: "100vw",
    margin: 0,
    padding: 0,
    backgroundColor: "#f8f9fa",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
  };

  // Container: responsive full width up to a max, with padding and centered text.
  const containerStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: "1000px", // Allows the container to be wide on larger screens.
    backgroundColor: "#1e1e1e",
    borderRadius: "8px",
    padding: "2rem",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
    textAlign: "center",
    color: "#ffffff",
  };

  const headingStyle: React.CSSProperties = {
    fontSize: "2rem",
    marginBottom: "0.5rem",
  };

  const subHeadingStyle: React.CSSProperties = {
    marginBottom: "1.5rem",
    color: "#ccc",
  };

  const formGroupStyle: React.CSSProperties = {
    marginBottom: "1.5rem",
    textAlign: "left",
    maxWidth: "600px",
    margin: "0 auto 1.5rem", // Center the form group within the container.
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "0.5rem",
    fontWeight: 600,
    color: "#ddd",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.75rem",
    fontSize: "1rem",
    border: isValidUrl ? "1px solid #ccc" : "1px solid red",
    borderRadius: "4px",
  };

  const buttonStyle: React.CSSProperties = {
    marginTop: "1rem",
    padding: "0.75rem 1.5rem",
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    fontSize: "1rem",
    cursor: "pointer",
  };

  const buttonDisabledStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: "#aaa",
    cursor: "not-allowed",
  };

  const errorStyle: React.CSSProperties = {
    color: "red",
    marginTop: "1rem",
  };

  const screenshotContainerStyle: React.CSSProperties = {
    marginTop: "2rem",
    textAlign: "center",
  };

  const screenshotStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid #ccc",
    borderRadius: "4px",
    marginTop: "1rem",
  };
  // -------------------------------

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <h2 style={headingStyle}>AutoSnapper</h2>
        <p style={subHeadingStyle}>Enter a URL to capture a screenshot</p>
        <div style={formGroupStyle}>
          <label htmlFor="url" style={labelStyle}>
            URL
          </label>
          <input
            id="url"
            value={url}
            onChange={handleUrlChange}
            placeholder="https://example.com"
            style={inputStyle}
          />
          {!isValidUrl && (
            <p style={{ color: "red", marginTop: "0.5rem" }}>
              Please enter a valid URL
            </p>
          )}
        </div>
        <button
          onClick={handleCapture}
          disabled={!isValidUrl || !url}
          style={!isValidUrl || !url ? buttonDisabledStyle : buttonStyle}
        >
          Capture Screenshot
        </button>
        {errorMessage && <p style={errorStyle}>{errorMessage}</p>}
        {screenshot && (
          <div style={screenshotContainerStyle}>
            <h3 style={{ marginBottom: "1rem" }}>Captured Screenshot</h3>
            <img src={screenshot} alt="Captured Screenshot" style={screenshotStyle} />
          </div>
        )}
      </div>
    </div>
  );
}