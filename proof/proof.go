package main

import (
	"fmt"
	"math/big"
	"os"

	"github.com/consensys/gnark-crypto/ecc"
	"github.com/consensys/gnark/backend/groth16"
	"github.com/consensys/gnark/frontend"
	"github.com/consensys/gnark/frontend/cs/r1cs"
)

// generateProof processes the input from the API and generates a proof
// Returns: proof output with all required data
func generateProof(input ProofInput) (*ProofOutput, error) {
	// Convert string inputs to big.Int
	secret := new(big.Int)
	secret.SetString(input.Secret, 10)

	nullifier := new(big.Int)
	nullifier.SetString(input.Nullifier, 10)

	assetID := new(big.Int)
	assetID.SetString(input.AssetID, 10)

	amount := new(big.Int)
	amount.SetString(input.Amount, 10)

	// Convert merkle proof strings to big.Int array
	var merkleProof [TreeDepth]*big.Int
	for i, proofElem := range input.MerkleProof {
		if i >= TreeDepth {
			break
		}
		merkleProof[i] = new(big.Int)
		merkleProof[i].SetString(proofElem, 10)
	}

	// Convert path indices
	var pathIndices [TreeDepth]int
	for i, idx := range input.PathIndices {
		if i >= TreeDepth {
			break
		}
		pathIndices[i] = idx
	}

	var pathIndicesBigInt [TreeDepth]frontend.Variable
	for i, idx := range pathIndices {
		pathIndicesBigInt[i] = big.NewInt(int64(idx))
	}

	// Convert merkle proof to frontend.Variable
	var pathElements [TreeDepth]frontend.Variable
	for i, elem := range merkleProof {
		pathElements[i] = elem
	}

	// Compute the leaf node
	leaf := MiMCHash(secret, nullifier, assetID, amount)

	// Compute the Merkle root
	root := computeMerkleRootFromPath(leaf, merkleProof, pathIndices)

	// Compute the nullifier hash
	nullifierHash := MiMCHash(nullifier, assetID)

	var assignment = &MASPCircuit{
		Secret:        secret,
		Nullifier:     nullifier,
		AssetID:       assetID,
		Amount:        amount,
		PathElements:  pathElements,
		PathIndices:   pathIndicesBigInt,
		Root:          root,
		NullifierHash: nullifierHash,
		PublicAssetID: assetID,
		PublicAmount:  amount,
	}

	// Generate the proof
	r1cs, err := frontend.Compile(ecc.BN254.ScalarField(), r1cs.NewBuilder, &MASPCircuit{})
	if err != nil {
		return &ProofOutput{Success: false}, fmt.Errorf("failed to compile circuit: %w", err)
	}

	witness, err := frontend.NewWitness(assignment, ecc.BN254.ScalarField())
	if err != nil {
		return &ProofOutput{Success: false}, fmt.Errorf("failed to create witness: %w", err)
	}

	// Generate proving key
	pk, _, err := groth16.Setup(r1cs)
	if err != nil {
		return &ProofOutput{Success: false}, fmt.Errorf("failed to setup proving key: %w", err)
	}

	// Generate proof
	proof, err := groth16.Prove(r1cs, pk, witness)
	if err != nil {
		return &ProofOutput{Success: false}, fmt.Errorf("failed to generate proof: %w", err)
	}

	// Create the output
	output := &ProofOutput{
		Proof:         proof,
		Success:       true,
		Root:          root.String(),
		NullifierHash: nullifierHash.String(),
		PublicAssetID: assetID.String(),
		PublicAmount:  amount.String(),
	}

	return output, nil
}

// GenerateSolidityVerifier creates a Solidity verifier contract for the circuit
func GenerateSolidityVerifier(circuit frontend.Circuit, outputDir string) error {
	// Create output directory if it doesn't exist
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return fmt.Errorf("failed to create output directory: %w", err)
	}

	// Compile the circuit to R1CS
	ccs, err := frontend.Compile(ecc.BN254.ScalarField(), r1cs.NewBuilder, circuit)
	if err != nil {
		return fmt.Errorf("failed to compile circuit: %w", err)
	}

	// Setup: Generate proving and verification keys
	_, vk, err := groth16.Setup(ccs)
	if err != nil {
		return fmt.Errorf("failed to set up proving and verification keys: %w", err)
	}

	// Generate Solidity verifier
	f, err := os.Create(outputDir + "/MASPVerifier.sol")
	if err != nil {
		return fmt.Errorf("failed to create verifier file: %w", err)
	}
	defer f.Close()

	err = vk.ExportSolidity(f)
	if err != nil {
		return fmt.Errorf("failed to export verifier: %w", err)
	}

	fmt.Println("Successfully generated Groth16 Solidity verifier")
	return nil
}
