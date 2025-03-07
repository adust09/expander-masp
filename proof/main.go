package main

import (
	"encoding/json"
	"fmt"
	"math/big"
	"os"

	"github.com/PolyhedraZK/ExpanderCompilerCollection/ecgo"
	"github.com/PolyhedraZK/ExpanderCompilerCollection/test"
	"github.com/consensys/gnark-crypto/ecc"
	crypto_mimc "github.com/consensys/gnark-crypto/ecc/bn254/fr/mimc"
	"github.com/consensys/gnark/frontend"
	"github.com/consensys/gnark/std/hash/mimc"
)

func MiMCHash(inputs ...*big.Int) *big.Int {
	h := crypto_mimc.NewMiMC()
	for _, input := range inputs {
		// Write the bytes of the input.
		h.Write(input.Bytes())
	}
	return new(big.Int).SetBytes(h.Sum(nil))
}

// TreeDepth is the number of levels in the Merkle tree.
// In a production circuit, this would typically be much larger.
const TreeDepth = 3

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

// Define declares the circuit's constraints.
func (c *MASPCircuit) Define(api frontend.API) error {
	// -----------------------------------------------
	// 1. Compute the deposit commitment (the leaf)
	// -----------------------------------------------
	hCommit, err := mimc.NewMiMC(api)
	if err != nil {
		return err
	}
	hCommit.Write(c.Secret)
	hCommit.Write(c.Nullifier)
	hCommit.Write(c.AssetID)
	hCommit.Write(c.Amount)
	leaf := hCommit.Sum()

	// -------------------------------------------------------
	// 2. Verify the Merkle proof using the helper function.
	// -------------------------------------------------------
	computedRoot, err := computeMerkleRoot(api, leaf, c.PathElements, c.PathIndices)
	if err != nil {
		return err
	}
	// Enforce that the computed Merkle root matches the public Root.
	api.AssertIsEqual(computedRoot, c.Root)

	// ---------------------------------------------
	// 3. Compute and check the nullifier hash.
	// ---------------------------------------------
	hNullifier, err := mimc.NewMiMC(api)
	if err != nil {
		return err
	}
	hNullifier.Write(c.Nullifier)
	hNullifier.Write(c.AssetID) // Include AssetID in nullifier hash to prevent cross-asset nullifier reuse
	computedNullifierHash := hNullifier.Sum()
	api.AssertIsEqual(computedNullifierHash, c.NullifierHash)

	// ---------------------------------------------
	// 4. Verify the asset ID and amount.
	// ---------------------------------------------
	api.AssertIsEqual(c.AssetID, c.PublicAssetID)
	api.AssertIsEqual(c.Amount, c.PublicAmount)

	return nil
}

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

// AssetType represents different types of assets in the MASP
type AssetType struct {
	ID     *big.Int
	Symbol string
}

// Define some example asset types
var (
	ETH  = AssetType{ID: big.NewInt(1), Symbol: "ETH"}
	DAI  = AssetType{ID: big.NewInt(2), Symbol: "DAI"}
	USDC = AssetType{ID: big.NewInt(3), Symbol: "USDC"}
	USDT = AssetType{ID: big.NewInt(4), Symbol: "USDT"}
)

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
	Proof         string `json:"proof"`
	Root          string `json:"root"`
	NullifierHash string `json:"nullifierHash"`
	PublicAssetID string `json:"publicAssetId"`
	PublicAmount  string `json:"publicAmount"`
}

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

		// Generate the proof
		generateProofFromInput(input)
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
	os.WriteFile("circuit.txt", c.Serialize(), 0o644)

	inputSolver := circuit.GetInputSolver()
	witness, err := inputSolver.SolveInputAuto(assignment)
	if err != nil {
		panic(fmt.Sprintf("Failed to solve inputs: %v", err))
	}

	os.WriteFile("witness.txt", witness.Serialize(), 0o644)

	if !test.CheckCircuit(c, witness) {
		panic("Expander circuit verification failed")
	}
	fmt.Println("Expander circuit verification successful")

	// Step 2: Generate Solidity verifier for Ethereum
	fmt.Println("Generating Solidity verifier for Ethereum...")
	emptyCircuit := &MASPCircuit{}
	err = GenerateGroth16SolidityVerifier(emptyCircuit, outputDir)
	if err != nil {
		panic(fmt.Sprintf("Failed to generate Solidity verifier: %v", err))
	}

	// Step 3: Generate proof for Ethereum verification
	fmt.Println("Generating proof for Ethereum verification...")
	err = GenerateGroth16Proof(emptyCircuit, assignment, outputDir)
	if err != nil {
		panic(fmt.Sprintf("Failed to generate proof: %v", err))
	}

}

// Helper function to demonstrate how to create a deposit
func createDeposit(secret, nullifier *big.Int, asset AssetType, amount *big.Int) *big.Int {
	return MiMCHash(secret, nullifier, asset.ID, amount)
}

// Helper function to demonstrate how to create a withdrawal proof
func createWithdrawalProof(
	secret, nullifier *big.Int,
	asset AssetType,
	amount *big.Int,
	merkleProof [TreeDepth]*big.Int,
	pathIndices [TreeDepth]int,
) *MASPCircuit {
	// Convert path indices to big.Int
	var pathIndicesBigInt [TreeDepth]frontend.Variable
	for i, idx := range pathIndices {
		pathIndicesBigInt[i] = big.NewInt(int64(idx))
	}

	// Convert merkle proof to frontend.Variable
	var pathElements [TreeDepth]frontend.Variable
	for i, elem := range merkleProof {
		pathElements[i] = elem
	}

	return &MASPCircuit{
		Secret:        secret,
		Nullifier:     nullifier,
		AssetID:       asset.ID,
		Amount:        amount,
		PathElements:  pathElements,
		PathIndices:   pathIndicesBigInt,
		Root:          nil, // To be computed based on the actual Merkle tree
		NullifierHash: MiMCHash(nullifier, asset.ID),
		PublicAssetID: asset.ID,
		PublicAmount:  amount,
	}
}

// generateProofFromInput processes the input from the API and generates a proof
func generateProofFromInput(input ProofInput) {
	// Convert string inputs to big.Int
	secret := new(big.Int)
	secret.SetString(input.Secret, 10)

	nullifier := new(big.Int)
	nullifier.SetString(input.Nullifier, 10)

	assetID := new(big.Int)
	assetID.SetString(input.AssetID, 10)

	amount := new(big.Int)
	amount.SetString(input.Amount, 10)

	// Create asset type
	asset := AssetType{ID: assetID, Symbol: "CUSTOM"}

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

	// Create the circuit assignment using the helper function
	assignment := createWithdrawalProof(
		secret,
		nullifier,
		asset,
		amount,
		merkleProof,
		pathIndices,
	)

	// Compute the leaf and root
	leaf := MiMCHash(secret, nullifier, assetID, amount)

	// Compute the Merkle path to get the root
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

	// Set the computed root
	root := currentNode
	assignment.Root = root

	// Compute the nullifier hash
	nullifierHash := MiMCHash(nullifier, assetID)
	assignment.NullifierHash = nullifierHash

	// Create output directory for verification artifacts
	outputDir := "ethereum_verifier"
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		fmt.Printf("Failed to create output directory: %v\n", err)
		os.Exit(1)
	}

	// Generate the proof
	fmt.Println("Compiling and verifying circuit with Expander...")
	circuit, err := ecgo.Compile(ecc.BN254.ScalarField(), &MASPCircuit{})
	if err != nil {
		fmt.Printf("Failed to compile circuit: %v\n", err)
		os.Exit(1)
	}

	c := circuit.GetLayeredCircuit()
	os.WriteFile("circuit.txt", c.Serialize(), 0o644)

	inputSolver := circuit.GetInputSolver()
	witness, err := inputSolver.SolveInputAuto(assignment)
	if err != nil {
		fmt.Printf("Failed to solve inputs: %v\n", err)
		os.Exit(1)
	}

	os.WriteFile("witness.txt", witness.Serialize(), 0o644)

	if !test.CheckCircuit(c, witness) {
		fmt.Println("Expander circuit verification failed")
		os.Exit(1)
	}

	// Generate proof for Ethereum verification
	fmt.Println("Generating proof for Ethereum verification...")
	emptyCircuit := &MASPCircuit{}

	// Generate Solidity verifier for Ethereum
	err = GenerateGroth16SolidityVerifier(emptyCircuit, outputDir)
	if err != nil {
		fmt.Printf("Failed to generate Solidity verifier: %v\n", err)
		os.Exit(1)
	}

	// Generate proof
	err = GenerateGroth16Proof(emptyCircuit, assignment, outputDir)
	if err != nil {
		fmt.Printf("Failed to generate proof: %v\n", err)
		os.Exit(1)
	}

	// Create the output structure
	output := ProofOutput{
		Proof:         "proof.bin", // Just the filename, in a real implementation we'd encode the actual proof
		Root:          root.String(),
		NullifierHash: nullifierHash.String(),
		PublicAssetID: assetID.String(),
		PublicAmount:  amount.String(),
	}

	// Output the result as JSON
	outputJSON, err := json.Marshal(output)
	if err != nil {
		fmt.Printf("Failed to marshal output to JSON: %v\n", err)
		os.Exit(1)
	}

	fmt.Println(string(outputJSON))
}
