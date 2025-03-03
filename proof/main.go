package main

import (
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

func main() {
	// Example values for demonstration
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

	fmt.Println("Successfully generated Ethereum verification artifacts in:", outputDir)
	fmt.Println("- MASPVerifier.sol: Solidity verifier contract")
	fmt.Println("- proving_key.bin: Proving key for generating proofs")
	fmt.Println("- verification_key.bin: Verification key for verifying proofs")
	fmt.Println("- proof.bin: Generated proof")
	fmt.Println("- calldata_instructions.txt: Instructions for using the proof with the verifier")
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
