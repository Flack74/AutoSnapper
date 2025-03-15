# Build stage: Use an official Go image for compilation
FROM golang:1.24-bullseye AS builder

# Set working directory inside the container
WORKDIR /app

# Copy Go module files and download dependencies (optimizing Docker cache usage)
COPY go.mod go.sum ./
RUN go mod download

# Copy the application source code
COPY . .

# Build the Go binary (static binary for minimal dependencies)
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o autosnapper .

# Final stage: Minimal Debian-based image for runtime
FROM debian:bullseye-slim

# Install only required libraries for Chromium to run (avoiding unnecessary bloat)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    xdg-utils \
 && rm -rf /var/lib/apt/lists/*  # Reduce image size by cleaning up

# Set working directory for runtime
WORKDIR /root/

# Copy the compiled binary from the builder stage
COPY --from=builder /app/autosnapper .

# Ensure the binary is executable
RUN chmod +x autosnapper

# Expose port 8080 (Render uses PORT env variable)
EXPOSE 8080

# Run the application, ensuring it respects the PORT variable
CMD ["sh", "-c", "./autosnapper --port=${PORT:-8080}"]
