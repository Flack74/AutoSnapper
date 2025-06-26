import React, { useState, useEffect } from "react";

interface HistoryItem {
  url: string;
  timestamp: string;
  imageData: string;
}

export default function Autosnapper() {
  const [url, setUrl] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isValidUrl, setIsValidUrl] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'capture' | 'history'>('capture');
  const [isCached, setIsCached] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<string>("");

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    setIsValidUrl(isValidHttpUrl(value));
  };

  const fetchHistory = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";
      const response = await fetch(`${backendUrl}/api/history`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleCapture = async () => {
    if (!isValidUrl || !url) return;

    try {
      setErrorMessage("");
      setScreenshot(null);
      setIsLoading(true);
      setIsCached(false);

      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";
      const response = await fetch(`${backendUrl}/api/screenshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error("Failed to capture screenshot. Check server logs.");
      }

      const data = await response.json();
      setScreenshot(`data:image/png;base64,${data.imageData}`);
      setIsCached(data.cached || false);
      
      if (!data.cached) {
        setTimeout(fetchHistory, 500);
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to capture screenshot');
    } finally {
      setIsLoading(false);
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

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const shortenUrl = (url: string, maxLength: number = 50) => {
    if (url.length <= maxLength) return url;
    const start = url.substring(0, 20);
    const end = url.substring(url.length - 25);
    return `${start}...${end}`;
  };

  const downloadScreenshot = () => {
    if (!screenshot) return;
    
    const link = document.createElement('a');
    link.href = screenshot;
    link.download = `screenshot-${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = async () => {
    if (!screenshot) return;
    
    try {
      const response = await fetch(screenshot);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setCopySuccess('✅ Copied!');
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
      setCopySuccess('❌ Failed');
      setTimeout(() => setCopySuccess(''), 2000);
    }
  };

  return (
    <div className="page">
      <div className="container">
        <div className="header">
          <h1 className="title">📸 AutoSnapper</h1>
          <p className="subtitle">Professional Website Screenshot Service</p>
        </div>

        <div className="tabs">
          <div 
            className={`tab ${activeTab === 'capture' ? 'active' : ''}`}
            onClick={() => setActiveTab('capture')}
          >
            🎯 Capture Screenshot
          </div>
          <div 
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📚 Recent History ({history.length})
          </div>
        </div>

        {activeTab === 'capture' && (
          <div>
            <div className="input-group">
              <label htmlFor="url" className="label">
                🌐 Website URL
              </label>
              <input
                id="url"
                value={url}
                onChange={handleUrlChange}
                placeholder="https://example.com"
                className={`input ${!isValidUrl ? 'invalid' : ''}`}
              />
              {!isValidUrl && (
                <p className="error-text">
                  ⚠️ Please enter a valid URL starting with http:// or https://
                </p>
              )}
            </div>
            
            <button
              onClick={handleCapture}
              disabled={!isValidUrl || !url || isLoading}
              className="capture-button"
            >
              {isLoading ? (
                <>
                  <div className="spinner" />
                  Capturing...
                </>
              ) : (
                <>📸 Capture Screenshot</>
              )}
            </button>

            {errorMessage && (
              <div className="error">
                ❌ {errorMessage}
              </div>
            )}

            {screenshot && (
              <div className="result-card">
                <div className={`badge ${isCached ? 'cached' : 'fresh'}`}>
                  {isCached ? "⚡ Served from Cache" : "🆕 Fresh Capture"}
                </div>
                <h3 className="result-title">📷 Screenshot Result</h3>
                <img src={screenshot} alt="Captured Screenshot" className="screenshot" />
                
                <div className="action-buttons">
                  <button onClick={downloadScreenshot} className="action-button">
                    💾 Download
                  </button>
                  <button onClick={copyToClipboard} className="action-button">
                    📋 {copySuccess || 'Copy Image'}
                  </button>
                </div>
                
                <div className="url-display">
                  🔗 {shortenUrl(url)}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <h3 className="history-title">📚 Recent Screenshots</h3>
            {history.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h4>No screenshots yet</h4>
                <p>Capture your first screenshot to see it here!</p>
              </div>
            ) : (
              <div className="history-grid">
                {history.map((item, index) => (
                  <div 
                    key={index} 
                    className="history-card"
                    onClick={() => {
                      setUrl(item.url);
                      setScreenshot(`data:image/png;base64,${item.imageData}`);
                      setActiveTab('capture');
                      setIsCached(true);
                    }}
                  >
                    <img 
                      src={`data:image/png;base64,${item.imageData}`} 
                      alt={`Screenshot of ${item.url}`}
                      className="history-image"
                    />
                    <div className="history-url">
                      🔗 {shortenUrl(item.url, 45)}
                    </div>
                    <div className="history-time">
                      🕒 {formatTimestamp(item.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      <style>{`
        * {
          box-sizing: border-box;
        }
        
        body {
          margin: 0;
          padding: 0;
          width: 100vw;
          overflow-x: hidden;
          background: #000000;
        }
        
        .page {
          min-height: 100vh;
          width: 100vw;
          background: linear-gradient(135deg, #0a0a0a 0%, #1a0000 50%, #000000 100%);
          font-family: 'Playfair Display', 'Inter', serif;
          padding: clamp(0.5rem, 2vw, 1rem);
          margin: 0;
          box-sizing: border-box;
          position: relative;
          overflow-x: hidden;
        }
        
        .container {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          background-color: rgba(10, 10, 10, 0.95);
          border: 1px solid rgba(220, 38, 38, 0.3);
          border-radius: clamp(12px, 3vw, 24px);
          padding: clamp(1rem, 4vw, 3rem);
          box-shadow: 0 25px 50px rgba(220, 38, 38, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          box-sizing: border-box;
          position: relative;
        }
        
        .header {
          text-align: center;
          margin-bottom: clamp(2rem, 5vw, 3rem);
          position: relative;
        }
        
        .title {
          font-size: clamp(2rem, 8vw, 4rem);
          font-weight: 400;
          font-family: 'Playfair Display', serif;
          background: linear-gradient(135deg, #dc2626, #991b1b, #7f1d1d);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 1rem;
          letter-spacing: clamp(1px, 0.5vw, 2px);
          text-shadow: 0 0 30px rgba(220, 38, 38, 0.3);
        }
        
        .subtitle {
          font-size: clamp(1rem, 3vw, 1.3rem);
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 2rem;
          font-weight: 300;
          letter-spacing: 1px;
        }
        
        .tabs {
          display: flex;
          margin-bottom: clamp(2rem, 4vw, 3rem);
          background-color: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(220, 38, 38, 0.2);
          border-radius: clamp(8px, 2vw, 16px);
          padding: 6px;
          backdrop-filter: blur(10px);
          flex-direction: column;
          gap: 6px;
        }
        
        @media (min-width: 640px) {
          .tabs {
            flex-direction: row;
            gap: 0;
          }
        }
        
        .tab {
          flex: 1;
          padding: clamp(12px, 3vw, 16px) clamp(16px, 4vw, 32px);
          text-align: center;
          border-radius: clamp(6px, 1.5vw, 12px);
          cursor: pointer;
          font-weight: 500;
          font-size: clamp(0.9rem, 2.5vw, 1.1rem);
          letter-spacing: 0.5px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          color: rgba(255, 255, 255, 0.6);
        }
        
        .tab.active {
          background: linear-gradient(135deg, #dc2626, #991b1b);
          color: white;
          box-shadow: 0 8px 25px rgba(220, 38, 38, 0.3);
        }
        
        .input-group {
          margin-bottom: 2rem;
        }
        
        .label {
          display: block;
          margin-bottom: 1rem;
          font-weight: 500;
          font-size: clamp(1rem, 2.5vw, 1.1rem);
          color: rgba(255, 255, 255, 0.9);
          letter-spacing: 0.5px;
        }
        
        .input {
          width: 100%;
          padding: clamp(16px, 4vw, 20px) clamp(20px, 5vw, 24px);
          font-size: clamp(1rem, 2.5vw, 1.1rem);
          border: 2px solid rgba(220, 38, 38, 0.3);
          border-radius: clamp(8px, 2vw, 16px);
          outline: none;
          transition: all 0.3s ease;
          background-color: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(10px);
          box-sizing: border-box;
          color: white;
          font-family: 'Inter', sans-serif;
        }
        
        .input.invalid {
          border-color: rgba(239, 68, 68, 0.8);
        }
        
        .input:focus {
          border-color: rgba(220, 38, 38, 0.8);
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.2);
        }
        
        .error-text {
          color: #fca5a5;
          margin-top: 1rem;
          font-size: clamp(0.9rem, 2vw, 1rem);
          letter-spacing: 0.3px;
        }
        
        .capture-button {
          width: 100%;
          padding: clamp(16px, 4vw, 20px);
          font-size: clamp(1rem, 2.5vw, 1.2rem);
          font-weight: 500;
          border: 2px solid rgba(220, 38, 38, 0.3);
          border-radius: clamp(8px, 2vw, 16px);
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          background: linear-gradient(135deg, #dc2626, #991b1b, #7f1d1d);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          letter-spacing: 1px;
          text-transform: uppercase;
          box-shadow: 0 10px 30px rgba(220, 38, 38, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }
        
        .capture-button:disabled {
          background: rgba(60, 60, 60, 0.5);
          cursor: not-allowed;
          box-shadow: none;
        }
        
        .capture-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 15px 35px rgba(220, 38, 38, 0.4);
        }
        
        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #ffffff;
          border-top: 2px solid transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .error {
          color: #fca5a5;
          background-color: rgba(220, 38, 38, 0.1);
          border: 1px solid rgba(220, 38, 38, 0.3);
          padding: 16px 20px;
          border-radius: 12px;
          margin-top: 1.5rem;
          backdrop-filter: blur(10px);
          font-size: clamp(0.9rem, 2vw, 1rem);
        }
        
        .result-card {
          margin-top: clamp(2rem, 4vw, 3rem);
          padding: clamp(1.5rem, 4vw, 2.5rem);
          background-color: rgba(0, 0, 0, 0.7);
          border: 1px solid rgba(220, 38, 38, 0.2);
          border-radius: clamp(12px, 3vw, 20px);
          backdrop-filter: blur(15px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }
        
        .badge {
          display: inline-block;
          padding: 8px 20px;
          border-radius: 25px;
          font-size: clamp(0.8rem, 2vw, 0.9rem);
          font-weight: 500;
          margin-bottom: 1.5rem;
          backdrop-filter: blur(10px);
          letter-spacing: 0.5px;
        }
        
        .badge.cached {
          background-color: rgba(34, 197, 94, 0.2);
          border: 1px solid rgba(34, 197, 94, 0.4);
          color: #22c55e;
        }
        
        .badge.fresh {
          background-color: rgba(220, 38, 38, 0.2);
          border: 1px solid rgba(220, 38, 38, 0.4);
          color: #dc2626;
        }
        
        .result-title {
          margin-bottom: 1.5rem;
          color: rgba(255, 255, 255, 0.9);
          font-size: clamp(1.2rem, 3vw, 1.4rem);
          font-weight: 400;
          letter-spacing: 1px;
        }
        
        .screenshot {
          width: 100%;
          max-width: 900px;
          border-radius: clamp(8px, 2vw, 16px);
          border: 2px solid rgba(220, 38, 38, 0.3);
          box-shadow: 0 20px 40px rgba(220, 38, 38, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05);
          margin: 2rem auto;
          display: block;
        }
        
        .action-buttons {
          display: flex;
          gap: clamp(0.5rem, 2vw, 1rem);
          margin-top: 1.5rem;
          justify-content: center;
          flex-wrap: wrap;
        }
        
        .action-button {
          padding: clamp(10px, 2.5vw, 12px) clamp(20px, 4vw, 24px);
          font-size: clamp(0.9rem, 2vw, 1rem);
          font-weight: 500;
          border: 1px solid rgba(220, 38, 38, 0.4);
          border-radius: clamp(8px, 2vw, 12px);
          cursor: pointer;
          transition: all 0.3s ease;
          background-color: rgba(220, 38, 38, 0.1);
          color: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          letter-spacing: 0.5px;
          min-width: clamp(120px, 25vw, 140px);
        }
        
        .action-button:hover {
          background-color: rgba(220, 38, 38, 0.2);
          transform: translateY(-2px);
        }
        
        .url-display {
          font-size: clamp(0.9rem, 2vw, 1rem);
          color: rgba(255, 255, 255, 0.7);
          margin-top: 1rem;
          letter-spacing: 0.3px;
          font-family: 'Inter', monospace;
          background-color: rgba(0, 0, 0, 0.3);
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid rgba(220, 38, 38, 0.2);
          word-break: break-all;
        }
        
        .history-title {
          margin-bottom: 2rem;
          color: rgba(255, 255, 255, 0.9);
          font-size: clamp(1.4rem, 3.5vw, 1.6rem);
          font-weight: 400;
          letter-spacing: 1px;
        }
        
        .empty-state {
          text-align: center;
          padding: clamp(3rem, 8vw, 4rem) 2rem;
          color: rgba(255, 255, 255, 0.6);
          font-size: clamp(1rem, 2.5vw, 1.1rem);
        }
        
        .empty-icon {
          font-size: clamp(2.5rem, 6vw, 3rem);
          margin-bottom: 1rem;
        }
        
        .history-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
          gap: clamp(1.5rem, 4vw, 2.5rem);
          margin-top: 3rem;
          width: 100%;
        }
        
        @media (min-width: 768px) {
          .history-grid {
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          }
        }
        
        .history-card {
          background-color: rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(220, 38, 38, 0.2);
          border-radius: clamp(12px, 3vw, 20px);
          padding: clamp(1rem, 3vw, 1.5rem);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(15px);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
        }
        
        .history-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 20px 40px rgba(220, 38, 38, 0.3);
        }
        
        .history-image {
          width: 100%;
          height: clamp(180px, 25vw, 220px);
          object-fit: cover;
          border-radius: clamp(8px, 2vw, 12px);
          border: 1px solid rgba(220, 38, 38, 0.3);
          margin-bottom: 1rem;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
        }
        
        .history-url {
          font-size: clamp(0.9rem, 2vw, 1rem);
          font-weight: 500;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 0.5rem;
          word-break: break-all;
          letter-spacing: 0.3px;
        }
        
        .history-time {
          font-size: clamp(0.8rem, 2vw, 0.9rem);
          color: rgba(220, 38, 38, 0.8);
          font-weight: 400;
        }
        
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');
      `}</style>
    </div>
  );
}