#!/bin/bash

# Test script for proof generation

# Sample input data
TEST_INPUT='{
  "secret": "123",
  "nullifier": "456",
  "assetId": "1",
  "amount": "1000000000000000000",
  "merkleProof": ["789", "101112", "131415"],
  "pathIndices": [0, 0, 0]
}'

echo "Testing proof generation with sample input:"
echo "$TEST_INPUT"
echo ""

# Run the proof generation command
echo "Running: ./pq-tornado generate-proof '$TEST_INPUT'"
./pq-tornado generate-proof "$TEST_INPUT"

echo ""
echo "Test completed."
