package main

import (
	"github.com/consensys/gnark/frontend"
	"github.com/consensys/gnark/std/hash/mimc"
)

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
