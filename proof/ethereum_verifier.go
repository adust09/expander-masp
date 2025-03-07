package main

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"

	"github.com/consensys/gnark-crypto/ecc"
	"github.com/consensys/gnark/backend/groth16"
	"github.com/consensys/gnark/frontend"
	"github.com/consensys/gnark/frontend/cs/r1cs"
)

// GenerateGroth16SolidityVerifier compiles the circuit, generates a proving and verification key,
// and exports a Solidity verifier contract.
func GenerateGroth16SolidityVerifier(circuit frontend.Circuit, outputDir string) error {
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
	var solidityBuf bytes.Buffer
	err = vk.ExportSolidity(&solidityBuf)
	if err != nil {
		return fmt.Errorf("failed to export Solidity verifier: %w", err)
	}

	// Also save the Solidity verifier to the hardhat/contracts directory
	hardhatContractsDir := "./hardhat/contracts"
	if err := os.MkdirAll(hardhatContractsDir, 0755); err != nil {
		return fmt.Errorf("failed to create hardhat contracts directory: %w", err)
	}

	err = os.WriteFile(filepath.Join(hardhatContractsDir, "MASPVerifier.sol"), solidityBuf.Bytes(), 0644)
	if err != nil {
		return fmt.Errorf("failed to write Solidity verifier to hardhat contracts directory: %w", err)
	}

	fmt.Println("Solidity verifier also saved to:", filepath.Join(hardhatContractsDir, "MASPVerifier.sol"))

	fmt.Println("Successfully generated Groth16 Solidity verifier")
	return nil
}

// GenerateGroth16Proof generates a Groth16 proof for the given circuit and witness
func GenerateGroth16Proof(circuit frontend.Circuit, assignment frontend.Circuit, outputDir string) error {
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
	pk, vk, err := groth16.Setup(ccs)
	if err != nil {
		return fmt.Errorf("failed to set up proving and verification keys: %w", err)
	}

	// Create a witness from the assignment
	witness, err := frontend.NewWitness(assignment, ecc.BN254.ScalarField())
	if err != nil {
		return fmt.Errorf("failed to create witness: %w", err)
	}

	// Extract public inputs
	publicWitness, err := witness.Public()
	if err != nil {
		return fmt.Errorf("failed to get public inputs: %w", err)
	}

	// Generate the proof
	proof, err := groth16.Prove(ccs, pk, witness)
	if err != nil {
		return fmt.Errorf("failed to generate proof: %w", err)
	}

	// Save the proof to a file
	proofFile, err := os.Create(filepath.Join(outputDir, "proof.bin"))
	if err != nil {
		return fmt.Errorf("failed to create proof file: %w", err)
	}
	defer proofFile.Close()
	_, err = proof.WriteTo(proofFile)
	if err != nil {
		return fmt.Errorf("failed to write proof: %w", err)
	}

	// Verify the proof (optional, for testing)
	err = groth16.Verify(proof, vk, publicWitness)
	if err != nil {
		return fmt.Errorf("proof verification failed: %w", err)
	}
	fmt.Println("Proof verified successfully(test)")
	fmt.Println("Successfully generated Groth16 proof and verification data")
	return nil
}
