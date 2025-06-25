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
      console.log('Fetching history from:', `${backendUrl}/api/history`);
      const response = await fetch(`${backendUrl}/api/history`);
      if (response.ok) {
        const data = await response.json();
        console.log('History data received:', data);
        setHistory(data.history || []);
      } else {
        console.error('History fetch failed:', response.status, response.statusText);
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
      
      // Refresh history after new capture
      if (!data.cached) {
        setTimeout(fetchHistory, 500);
      }
    } catch (error: any) {
      console.error('Screenshot capture failed:', error);
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

  // Royal Black & Red Theme
  const styles = {
    page: {
      minHeight: "100vh",
      width: "100vw",
      background: "linear-gradient(135deg, #0a0a0a 0%, #1a0000 50%, #000000 100%)",
      fontFamily: "'Playfair Display', 'Inter', serif",
      padding: "1rem",
      margin: 0,
      boxSizing: "border-box" as const,
      position: "relative" as const,
    } as React.CSSProperties,
    
    container: {
      width: "100%",
      maxWidth: "1400px",
      margin: "0 auto",
      backgroundColor: "rgba(10, 10, 10, 0.95)",
      border: "1px solid rgba(220, 38, 38, 0.3)",
      borderRadius: "24px",
      padding: "3rem",
      boxShadow: "0 25px 50px rgba(220, 38, 38, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
      backdropFilter: "blur(20px)",
      boxSizing: "border-box" as const,
      position: "relative" as const,
    } as React.CSSProperties,
    
    header: {
      textAlign: "center" as const,
      marginBottom: "3rem",
      position: "relative" as const,
    },
    
    title: {
      fontSize: "4rem",
      fontWeight: "400",
      fontFamily: "'Playfair Display', serif",
      background: "linear-gradient(135deg, #dc2626, #991b1b, #7f1d1d)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      marginBottom: "1rem",
      letterSpacing: "2px",
      textShadow: "0 0 30px rgba(220, 38, 38, 0.3)",
    } as React.CSSProperties,
    
    subtitle: {
      fontSize: "1.3rem",
      color: "rgba(255, 255, 255, 0.7)",
      marginBottom: "2rem",
      fontWeight: "300",
      letterSpacing: "1px",
    } as React.CSSProperties,
    
    tabs: {
      display: "flex",
      marginBottom: "3rem",
      backgroundColor: "rgba(0, 0, 0, 0.4)",
      border: "1px solid rgba(220, 38, 38, 0.2)",
      borderRadius: "16px",
      padding: "6px",
      backdropFilter: "blur(10px)",
    } as React.CSSProperties,
    
    tab: (active: boolean) => ({
      flex: 1,
      padding: "16px 32px",
      textAlign: "center" as const,
      borderRadius: "12px",
      cursor: "pointer",
      fontWeight: "500",
      fontSize: "1.1rem",
      letterSpacing: "0.5px",
      transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      backgroundColor: active ? "linear-gradient(135deg, #dc2626, #991b1b)" : "transparent",
      background: active ? "linear-gradient(135deg, #dc2626, #991b1b)" : "transparent",
      color: active ? "white" : "rgba(255, 255, 255, 0.6)",
      boxShadow: active ? "0 8px 25px rgba(220, 38, 38, 0.3)" : "none",
    } as React.CSSProperties),
    
    inputGroup: {
      marginBottom: "2rem",
    } as React.CSSProperties,
    
    label: {
      display: "block",
      marginBottom: "1rem",
      fontWeight: "500",
      fontSize: "1.1rem",
      color: "rgba(255, 255, 255, 0.9)",
      letterSpacing: "0.5px",
    } as React.CSSProperties,
    
    input: {
      width: "100%",
      padding: "20px 24px",
      fontSize: "1.1rem",
      border: `2px solid ${isValidUrl ? "rgba(220, 38, 38, 0.3)" : "rgba(239, 68, 68, 0.8)"}`,
      borderRadius: "16px",
      outline: "none",
      transition: "all 0.3s ease",
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      backdropFilter: "blur(10px)",
      boxSizing: "border-box" as const,
      color: "white",
      fontFamily: "'Inter', sans-serif",
    } as React.CSSProperties,
    
    button: {
      width: "100%",
      padding: "20px",
      fontSize: "1.2rem",
      fontWeight: "500",
      border: "2px solid rgba(220, 38, 38, 0.3)",
      borderRadius: "16px",
      cursor: isLoading || !isValidUrl || !url ? "not-allowed" : "pointer",
      transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      background: isLoading || !isValidUrl || !url 
        ? "rgba(60, 60, 60, 0.5)" 
        : "linear-gradient(135deg, #dc2626, #991b1b, #7f1d1d)",
      color: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "12px",
      letterSpacing: "1px",
      textTransform: "uppercase" as const,
      boxShadow: isLoading || !isValidUrl || !url 
        ? "none" 
        : "0 10px 30px rgba(220, 38, 38, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
    } as React.CSSProperties,
    
    resultCard: {
      marginTop: "3rem",
      padding: "2.5rem",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      border: "1px solid rgba(220, 38, 38, 0.2)",
      borderRadius: "20px",
      backdropFilter: "blur(15px)",
      boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
    } as React.CSSProperties,
    
    screenshot: {
      width: "100%",
      maxWidth: "900px",
      borderRadius: "16px",
      border: "2px solid rgba(220, 38, 38, 0.3)",
      boxShadow: "0 20px 40px rgba(220, 38, 38, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05)",
      margin: "2rem auto",
      display: "block",
    } as React.CSSProperties,
    
    badge: (cached: boolean) => ({
      display: "inline-block",
      padding: "8px 20px",
      borderRadius: "25px",
      fontSize: "0.9rem",
      fontWeight: "500",
      backgroundColor: cached ? "rgba(34, 197, 94, 0.2)" : "rgba(220, 38, 38, 0.2)",
      border: `1px solid ${cached ? "rgba(34, 197, 94, 0.4)" : "rgba(220, 38, 38, 0.4)"}`,
      color: cached ? "#22c55e" : "#dc2626",
      marginBottom: "1.5rem",
      backdropFilter: "blur(10px)",
      letterSpacing: "0.5px",
    } as React.CSSProperties),
    
    historyGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
      gap: "2.5rem",
      marginTop: "3rem",
      width: "100%",
    } as React.CSSProperties,
    
    historyCard: {
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      border: "1px solid rgba(220, 38, 38, 0.2)",
      borderRadius: "20px",
      padding: "1.5rem",
      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
      backdropFilter: "blur(15px)",
      transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      cursor: "pointer",
      position: "relative" as const,
    } as React.CSSProperties,
    
    historyImage: {
      width: "100%",
      height: "220px",
      objectFit: "cover" as const,
      borderRadius: "12px",
      border: "1px solid rgba(220, 38, 38, 0.3)",
      marginBottom: "1rem",
      boxShadow: "0 8px 20px rgba(0, 0, 0, 0.3)",
    } as React.CSSProperties,
    
    historyUrl: {
      fontSize: "1rem",
      fontWeight: "500",
      color: "rgba(255, 255, 255, 0.9)",
      marginBottom: "0.5rem",
      wordBreak: "break-all" as const,
      letterSpacing: "0.3px",
    } as React.CSSProperties,
    
    historyTime: {
      fontSize: "0.9rem",
      color: "rgba(220, 38, 38, 0.8)",
      fontWeight: "400",
    } as React.CSSProperties,
    
    error: {
      color: "#fca5a5",
      backgroundColor: "rgba(220, 38, 38, 0.1)",
      border: "1px solid rgba(220, 38, 38, 0.3)",
      padding: "16px 20px",
      borderRadius: "12px",
      marginTop: "1.5rem",
      backdropFilter: "blur(10px)",
      fontSize: "1rem",
    } as React.CSSProperties,
    
    emptyState: {
      textAlign: "center" as const,
      padding: "4rem 2rem",
      color: "rgba(255, 255, 255, 0.6)",
      fontSize: "1.1rem",
    } as React.CSSProperties,

    actionButtons: {
      display: "flex",
      gap: "1rem",
      marginTop: "1.5rem",
      justifyContent: "center",
      flexWrap: "wrap" as const,
    } as React.CSSProperties,

    actionButton: {
      padding: "12px 24px",
      fontSize: "1rem",
      fontWeight: "500",
      border: "1px solid rgba(220, 38, 38, 0.4)",
      borderRadius: "12px",
      cursor: "pointer",
      transition: "all 0.3s ease",
      backgroundColor: "rgba(220, 38, 38, 0.1)",
      color: "rgba(255, 255, 255, 0.9)",
      backdropFilter: "blur(10px)",
      letterSpacing: "0.5px",
      minWidth: "140px",
    } as React.CSSProperties,

    urlDisplay: {
      fontSize: "1rem",
      color: "rgba(255, 255, 255, 0.7)",
      marginTop: "1rem",
      letterSpacing: "0.3px",
      fontFamily: "'Inter', monospace",
      backgroundColor: "rgba(0, 0, 0, 0.3)",
      padding: "8px 12px",
      borderRadius: "8px",
      border: "1px solid rgba(220, 38, 38, 0.2)",
    } as React.CSSProperties,
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>📸 AutoSnapper</h1>
          <p style={styles.subtitle}>Professional Website Screenshot Service</p>
        </div>

        {/* Tab Navigation */}
        <div style={styles.tabs}>
          <div 
            style={styles.tab(activeTab === 'capture')} 
            onClick={() => setActiveTab('capture')}
          >
            🎯 Capture Screenshot
          </div>
          <div 
            style={styles.tab(activeTab === 'history')} 
            onClick={() => setActiveTab('history')}
          >
            📚 Recent History ({history.length})
          </div>
        </div>

        {/* Capture Tab */}
        {activeTab === 'capture' && (
          <div>
            <div style={styles.inputGroup}>
              <label htmlFor="url" style={styles.label}>
                🌐 Website URL
              </label>
              <input
                id="url"
                value={url}
                onChange={handleUrlChange}
                placeholder="https://example.com"
                style={styles.input}
              />
              {!isValidUrl && (
                <p style={{ color: "#fca5a5", marginTop: "1rem", fontSize: "1rem", letterSpacing: "0.3px" }}>
                  ⚠️ Please enter a valid URL starting with http:// or https://
                </p>
              )}
            </div>
            
            <button
              onClick={handleCapture}
              disabled={!isValidUrl || !url || isLoading}
              style={styles.button}
            >
              {isLoading ? (
                <>
                  <div style={{
                    width: "20px",
                    height: "20px",
                    border: "2px solid #ffffff",
                    borderTop: "2px solid transparent",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite"
                  }} />
                  Capturing...
                </>
              ) : (
                <>📸 Capture Screenshot</>
              )}
            </button>

            {errorMessage && (
              <div style={styles.error}>
                ❌ {errorMessage}
              </div>
            )}

            {screenshot && (
              <div style={styles.resultCard}>
                <div style={styles.badge(isCached)}>
                  {isCached ? "⚡ Served from Cache" : "🆕 Fresh Capture"}
                </div>
                <h3 style={{ marginBottom: "1.5rem", color: "rgba(255, 255, 255, 0.9)", fontSize: "1.4rem", fontWeight: "400", letterSpacing: "1px" }}>📷 Screenshot Result</h3>
                <img src={screenshot} alt="Captured Screenshot" style={styles.screenshot} />
                
                <div style={styles.actionButtons}>
                  <button 
                    onClick={downloadScreenshot}
                    style={styles.actionButton}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(220, 38, 38, 0.2)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(220, 38, 38, 0.1)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    💾 Download
                  </button>
                  
                  <button 
                    onClick={copyToClipboard}
                    style={styles.actionButton}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(220, 38, 38, 0.2)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(220, 38, 38, 0.1)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    📋 {copySuccess || 'Copy Image'}
                  </button>
                </div>
                
                <div style={styles.urlDisplay}>
                  🔗 {shortenUrl(url)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div>
            <h3 style={{ marginBottom: "2rem", color: "rgba(255, 255, 255, 0.9)", fontSize: "1.6rem", fontWeight: "400", letterSpacing: "1px" }}>📚 Recent Screenshots</h3>
            {history.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📭</div>
                <h4>No screenshots yet</h4>
                <p>Capture your first screenshot to see it here!</p>
              </div>
            ) : (
              <div style={styles.historyGrid}>
                {history.map((item, index) => (
                  <div 
                    key={index} 
                    style={styles.historyCard}
                    onClick={() => {
                      setUrl(item.url);
                      setScreenshot(`data:image/png;base64,${item.imageData}`);
                      setActiveTab('capture');
                      setIsCached(true);
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-8px) scale(1.02)";
                      e.currentTarget.style.boxShadow = "0 20px 40px rgba(220, 38, 38, 0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0) scale(1)";
                      e.currentTarget.style.boxShadow = "0 10px 30px rgba(0, 0, 0, 0.3)";
                    }}
                  >
                    <img 
                      src={`data:image/png;base64,${item.imageData}`} 
                      alt={`Screenshot of ${item.url}`}
                      style={styles.historyImage}
                    />
                    <div style={styles.historyUrl}>
                      🔗 {shortenUrl(item.url, 45)}
                    </div>
                    <div style={styles.historyTime}>
                      🕒 {formatTimestamp(item.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* CSS Animation & Royal Theme */}
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
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(220, 38, 38, 0.3); }
          50% { box-shadow: 0 0 40px rgba(220, 38, 38, 0.6); }
        }
        
        input:focus {
          border-color: rgba(220, 38, 38, 0.8) !important;
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.2) !important;
        }
        
        button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 15px 35px rgba(220, 38, 38, 0.4) !important;
        }
        
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');
      `}</style>
    </div>
  );
}