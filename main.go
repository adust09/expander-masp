package main

import (
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

// TornadoCashCircuit defines a simplified Tornado Cash circuit.
// It proves that a deposit commitment (leaf = hash(Secret, Nullifier))
// is included in a Merkle tree with a known root and that the nullifier hash
// (hash(Nullifier)) matches a public input.
type TornadoCashCircuit struct {
	// Private inputs.
	Secret       frontend.Variable            `gnark:",secret"`
	Nullifier    frontend.Variable            `gnark:",secret"`
	PathElements [TreeDepth]frontend.Variable `gnark:",secret"` // Sibling nodes for the Merkle proof.
	PathIndices  [TreeDepth]frontend.Variable `gnark:",secret"` // Indicates position: 0 for left, 1 for right.

	// Public inputs.
	Root          frontend.Variable // The Merkle tree root.
	NullifierHash frontend.Variable // Hash of the nullifier.
}

// Define declares the circuit's constraints.
func (c *TornadoCashCircuit) Define(api frontend.API) error {
	// -----------------------------------------------
	// 1. Compute the deposit commitment (the leaf)
	// -----------------------------------------------
	hCommit, err := mimc.NewMiMC(api)
	if err != nil {
		return err
	}
	hCommit.Write(c.Secret)
	hCommit.Write(c.Nullifier)
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
	computedNullifierHash := hNullifier.Sum()
	api.AssertIsEqual(computedNullifierHash, c.NullifierHash)

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

func main() {

	secret := big.NewInt(123)
	nullifier := big.NewInt(456)

	sibling0 := big.NewInt(789)
	sibling1 := big.NewInt(101112)
	sibling2 := big.NewInt(131415)

	leaf := MiMCHash(secret, nullifier)

	level0 := MiMCHash(leaf, sibling0)
	level1 := MiMCHash(level0, sibling1)
	root := MiMCHash(level1, sibling2)

	nullifierHash := MiMCHash(nullifier)

	assignment := &TornadoCashCircuit{
		Secret:        secret,
		Nullifier:     nullifier,
		PathElements:  [TreeDepth]frontend.Variable{sibling0, sibling1, sibling2},
		PathIndices:   [TreeDepth]frontend.Variable{0, 0, 0},
		Root:          root,
		NullifierHash: nullifierHash,
	}

	circuit, _ := ecgo.Compile(ecc.BN254.ScalarField(), &TornadoCashCircuit{})
	c := circuit.GetLayeredCircuit()
	os.WriteFile("circuit.txt", c.Serialize(), 0o644)
	inputSolver := circuit.GetInputSolver()
	witness, _ := inputSolver.SolveInputAuto(assignment)
	os.WriteFile("witness.txt", witness.Serialize(), 0o644)
	if !test.CheckCircuit(c, witness) {
		panic("verification failed")
	}
}
