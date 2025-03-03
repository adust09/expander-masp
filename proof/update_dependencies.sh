#!/bin/bash

# Navigate to the proof directory
cd "$(dirname "$0")"

# Update Go module dependencies
go mod tidy

# Print module dependencies
echo "Current module dependencies:"
go list -m all
