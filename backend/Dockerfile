# Build Stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Copy dependency files and download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code and build binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o autosnapper

# Final Stage (Minimal Container)
FROM alpine:latest

WORKDIR /root/

# Install necessary dependencies for Chromium
RUN apk add --no-cache \
    libstdc++ \
    chromium \
    chromium-chromedriver \
    nss \
    freetype \
    ttf-freefont \
    harfbuzz \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Copy the binary from the builder stage
COPY --from=builder /app/autosnapper .

# Expose the port (Render uses the PORT env variable)
EXPOSE 8080

# Run the binary
CMD ["./autosnapper"]
