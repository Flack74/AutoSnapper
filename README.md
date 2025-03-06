# AutoSnapper 📸

AutoSnapper is a full-stack web application that automates the process of capturing website screenshots. It uses a Go backend (powered by [Rod](https://github.com/go-rod/rod) for headless browser automation) and a React/Vite frontend for a sleek and responsive user interface.

---

## Features ✨

- **Automated Screenshot Capture:**  
  Quickly capture full-page screenshots by entering a URL.
- **Clean & Responsive UI:**  
  A modern interface built with React + Vite.
- **Error Handling:**  
  Validates URLs and displays helpful error messages.
- **Simple Setup:**  
  Separate backend (Go) and frontend (React) components.

---

## Project Structure 🗂️

Your folder layout might look like this:

```
AUTOSNAPPER/
├── backend/
│   ├── go.mod
│   ├── go.sum
│   └── main.go        # Go backend using Rod
├── frontend/
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── index.css
│       └── main.jsx
└── README.md          # This file
```

> **Note:** You must run the **backend** and **frontend** separately. The **frontend** will run on **http://localhost:5173**, while the **backend** listens on **http://localhost:8080**.

---

## Prerequisites 🔧

- **Go:**  
  Install [Go](https://golang.org/dl/) (version 1.18+ recommended).
- **Node.js & npm:**  
  Ensure you have [Node.js](https://nodejs.org/) installed (npm is included).
- **Rod:**  
  The backend uses [Rod](https://github.com/go-rod/rod) for headless browser automation.

---

## Installation & Setup 🚀

### 1. Backend (Go)

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```
2. **(Optional) Download Dependencies** if using Go modules:
   ```bash
   go mod download
   ```
3. **Run the Go Server:**
   ```bash
   go run main.go
   ```
   The server will start and listen on **[http://localhost:8080](http://localhost:8080)**.

### 2. Frontend (React + Vite)

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```
2. **Install Dependencies:**
   ```bash
   npm install
   ```
3. **Start the Vite Development Server:**
   ```bash
   npm run dev
   ```
   The React app will typically be available at **[http://localhost:5173](http://localhost:5173)**.

---

## Running the Application 🔄

1. **Start the Go backend** (in one terminal):
   ```bash
   cd backend
   go run main.go
   ```
2. **Start the React frontend** (in another terminal):
   ```bash
   cd frontend
   npm run dev
   ```
3. **Open your browser** and go to **[http://localhost:5173](http://localhost:5173)**. 

You should see the AutoSnapper UI. When you enter a URL (e.g., `https://example.com`) and click “Capture Screenshot,” the request goes to **http://localhost:8080** where the Go backend captures a screenshot and returns it to the frontend.

---

## Usage 📲

1. **Enter a Valid URL** (must start with `http://` or `https://`).  
2. **Click “Capture Screenshot.”**  
3. **View the Screenshot**:  
   The screenshot will be displayed in the UI if successfully captured by the Go backend.

---

## Troubleshooting 🛠️

- **CORS Issues:**  
  If you get “Failed to fetch,” ensure your Go server sets the correct CORS headers. For example, in `main.go`:
  ```go
  w.Header().Set("Access-Control-Allow-Origin", "*")
  w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
  w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
  if r.Method == http.MethodOptions {
      return
  }
  ```
- **Headless Browser Blocks:**  
  Some websites may block headless browsers. Try a simpler URL like `https://example.com` if you encounter issues.
- **Invalid URL:**  
  Check that your URL begins with `http://` or `https://`.

---

## Contributing 🤝

Contributions are welcome! Please fork the repository and submit a pull request with any improvements.

---

## License 📄

This project is licensed under the [MIT License](LICENSE).
