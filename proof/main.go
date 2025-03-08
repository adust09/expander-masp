package main

import (
	"encoding/json"
	"fmt"
	"math/big"
	"os"

	"github.com/PolyhedraZK/ExpanderCompilerCollection/ecgo"
	"github.com/PolyhedraZK/ExpanderCompilerCollection/test"
	"github.com/consensys/gnark-crypto/ecc"
	"github.com/consensys/gnark/frontend"
)

func main() {
	// Check if we're being called with command-line arguments
	if len(os.Args) > 1 && os.Args[1] == "generate-proof" {
		if len(os.Args) != 3 {
			fmt.Println("Usage: ./pq-tornado generate-proof '{\"secret\":\"123\",\"nullifier\":\"456\",...}'")
			os.Exit(1)
		}

		// Parse the JSON input
		var input ProofInput
		err := json.Unmarshal([]byte(os.Args[2]), &input)
		if err != nil {
			fmt.Printf("Error parsing input JSON: %v\n", err)
			os.Exit(1)
		}

		proof, _ := generateProof(input)
		jsonOutput, err := json.Marshal(proof)
		if err != nil {
			fmt.Printf("Error marshaling proof to JSON: %v\n", err)
			os.Exit(1)
		}
		fmt.Println(string(jsonOutput))
		return
	}

	// Default example for demonstration when run without arguments
	secret := big.NewInt(123)
	nullifier := big.NewInt(456)

	// Using ETH as the asset type for this example
	assetID := ETH.ID
	amount := big.NewInt(1000000000000000000) // 1 ETH in wei

	sibling0 := big.NewInt(789)
	sibling1 := big.NewInt(101112)
	sibling2 := big.NewInt(131415)

	// Compute the leaf using all commitment components
	leaf := MiMCHash(secret, nullifier, assetID, amount)

	// Compute the Merkle path
	level0 := MiMCHash(leaf, sibling0)
	level1 := MiMCHash(level0, sibling1)
	root := MiMCHash(level1, sibling2)

	// Compute the nullifier hash including the asset ID
	nullifierHash := MiMCHash(nullifier, assetID)

	// Create the circuit assignment
	assignment := &MASPCircuit{
		Secret:        secret,
		Nullifier:     nullifier,
		AssetID:       assetID,
		Amount:        amount,
		PathElements:  [TreeDepth]frontend.Variable{sibling0, sibling1, sibling2},
		PathIndices:   [TreeDepth]frontend.Variable{0, 0, 0},
		Root:          root,
		NullifierHash: nullifierHash,
		PublicAssetID: assetID,
		PublicAmount:  amount,
	}

	// Create output directory for verification artifacts
	outputDir := "ethereum_verifier"
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		panic(fmt.Sprintf("Failed to create output directory: %v", err))
	}

	// Step 1: Compile and verify the circuit using Expander
	fmt.Println("Compiling and verifying circuit with Expander...")
	circuit, err := ecgo.Compile(ecc.BN254.ScalarField(), &MASPCircuit{})
	if err != nil {
		panic(fmt.Sprintf("Failed to compile circuit: %v", err))
	}

	c := circuit.GetLayeredCircuit()

	inputSolver := circuit.GetInputSolver()
	witness, err := inputSolver.SolveInputAuto(assignment)
	if err != nil {
		panic(fmt.Sprintf("Failed to solve inputs: %v", err))
	}

	if !test.CheckCircuit(c, witness) {
		panic("Expander circuit verification failed")
	}
	fmt.Println("Expander circuit verification successful")

	// Step 2: Generate Solidity verifier for Ethereum
	fmt.Println("Generating Solidity verifier for Ethereum...")
	emptyCircuit := &MASPCircuit{}
	err = GenerateSolidityVerifier(emptyCircuit, outputDir)
	if err != nil {
		panic(fmt.Sprintf("Failed to generate Solidity verifier: %v", err))
	}

	// Step 3: Generate proof for Ethereum verification
	fmt.Println("Generating proof for Ethereum verification...")
	// var proof groth16.Proof
	// proof, err = GenerateGroth16Proof(assignment)
}
