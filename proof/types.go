package main

import (
	"math/big"

	"github.com/consensys/gnark/backend/groth16"
	"github.com/consensys/gnark/frontend"
)

// MASPCircuit defines a Multi Asset Shielded Pool circuit.
// It extends the basic Tornado Cash circuit to support multiple asset types.
// It proves that a deposit commitment (leaf = hash(Secret, Nullifier, AssetID, Amount))
// is included in a Merkle tree with a known root and that the nullifier hash
// (hash(Nullifier, AssetID)) matches a public input.
type MASPCircuit struct {
	// Private inputs.
	Secret       frontend.Variable            `gnark:",secret"`
	Nullifier    frontend.Variable            `gnark:",secret"`
	AssetID      frontend.Variable            `gnark:",secret"` // Identifier for the asset type
	Amount       frontend.Variable            `gnark:",secret"` // Amount of the asset
	PathElements [TreeDepth]frontend.Variable `gnark:",secret"` // Sibling nodes for the Merkle proof.
	PathIndices  [TreeDepth]frontend.Variable `gnark:",secret"` // Indicates position: 0 for left, 1 for right.

	// Public inputs.
	Root          frontend.Variable // The Merkle tree root.
	NullifierHash frontend.Variable // Hash of the nullifier and asset ID.
	PublicAssetID frontend.Variable // Public asset ID for verification
	PublicAmount  frontend.Variable // Public amount for verification
}

// AssetType represents different types of assets in the MASP
type AssetType struct {
	ID     *big.Int
	Symbol string
}

// ProofInput represents the input parameters for proof generation
type ProofInput struct {
	Secret      string   `json:"secret"`
	Nullifier   string   `json:"nullifier"`
	AssetID     string   `json:"assetId"`
	Amount      string   `json:"amount"`
	MerkleProof []string `json:"merkleProof"`
	PathIndices []int    `json:"pathIndices"`
}

// ProofOutput represents the output of the proof generation
type ProofOutput struct {
	Proof         groth16.Proof `json:"proof"`
	Success       bool          `json:"success"`
	Root          string        `json:"root,omitempty"`
	NullifierHash string        `json:"nullifierHash,omitempty"`
	PublicAssetID string        `json:"publicAssetId,omitempty"`
	PublicAmount  string        `json:"publicAmount,omitempty"`
}
