#!/bin/bash

# Build the Go program
echo "Building pq-tornado..."
go build -o pq-tornado .

# Make it executable
chmod +x pq-tornado

echo "Build complete. You can now run ./pq-tornado generate-proof '{...}'"
