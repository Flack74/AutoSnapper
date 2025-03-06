# backend/Dockerfile

# Use a Debian-based Go image (using bullseye instead of buster)
FROM golang:1.24-bullseye AS builder

WORKDIR /app

# Copy go.mod and go.sum, then download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the source code and build the binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o autosnapper .

# Final stage: use a minimal Debian-based image for the final container
FROM debian:bullseye-slim

# Install necessary libraries for Chromium to run, including libgbm1
RUN apt-get update && apt-get install -y \
    fonts-liberation \
    libappindicator3-1 \
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
 && rm -rf /var/lib/apt/lists/*

WORKDIR /root/

# Copy the binary from the builder stage
COPY --from=builder /app/autosnapper .

# Expose the port (Render uses the PORT env variable)
EXPOSE 8080

# Run the binary; your code should read PORT from the environment (or default to 8080)
CMD ["sh", "-c", "./autosnapper"]