# Use a stable Go version
FROM golang:1.21 AS builder

WORKDIR /app

# Copy go.mod and go.sum first (better caching)
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -o autosnapper .

# Final minimal container
FROM debian:bullseye-slim
WORKDIR /root/
COPY --from=builder /app/autosnapper .
CMD ["/root/autosnapper"]
