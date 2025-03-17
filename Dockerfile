FROM golang:1.22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN go build -o gemma-summarizer .

# Create lightweight production image
FROM alpine:latest

# Install SSL certificates for HTTPS requests
RUN apk --no-cache add ca-certificates

WORKDIR /app

# Copy binary from builder stage
COPY --from=builder /app/gemma-summarizer .
# Copy static files
COPY --from=builder /app/static ./static
# Copy .env file if it exists
COPY --from=builder /app/.env ./.env

# Expose the port defined in your application
ENV PORT=8080
EXPOSE 8080

# Set the application to run in production mode
ENV GIN_MODE=release

# Command to run when container starts
CMD ["./gemma-summarizer"]