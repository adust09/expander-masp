package main

import (
	"math/big"

	"github.com/consensys/gnark/frontend"
	"github.com/consensys/gnark/std/hash/mimc"
)

// computeMerkleRoot computes the Merkle tree root given a leaf and the Merkle proof.
// It iterates through each level of the Merkle proof using the provided sibling
// nodes and path indices, and returns the computed root.
func computeMerkleRoot(
	api frontend.API,
	leaf frontend.Variable,
	pathElements [TreeDepth]frontend.Variable,
	pathIndices [TreeDepth]frontend.Variable,
) (frontend.Variable, error) {
	computedRoot := leaf

	for i := 0; i < TreeDepth; i++ {
		// Ensure that the path index is boolean (i.e. 0 or 1).
		api.AssertIsBoolean(pathIndices[i])

		// Retrieve the sibling value at the current level.
		sibling := pathElements[i]

		// Use a fresh instance of MiMC for each hash computation.
		h, err := mimc.NewMiMC(api)
		if err != nil {
			return nil, err
		}

		// Determine the order of concatenation based on the path index:
		// If pathIndices[i] == 0, then computedRoot is the left child;
		// otherwise, it is the right child.
		left := api.Select(api.IsZero(pathIndices[i]), computedRoot, sibling)
		right := api.Select(api.IsZero(pathIndices[i]), sibling, computedRoot)
		h.Write(left)
		h.Write(right)
		computedRoot = h.Sum()
	}

	return computedRoot, nil
}

// computeMerkleRootFromPath computes a Merkle root from a leaf node and a path
// Used during proof generation (not in the circuit)
func computeMerkleRootFromPath(leaf *big.Int, merkleProof [TreeDepth]*big.Int, pathIndices [TreeDepth]int) *big.Int {
	currentNode := leaf
	for i := 0; i < TreeDepth; i++ {
		sibling := merkleProof[i]
		if pathIndices[i] == 0 {
			// Current node is left child
			currentNode = MiMCHash(currentNode, sibling)
		} else {
			// Current node is right child
			currentNode = MiMCHash(sibling, currentNode)
		}
	}
	return currentNode
}
