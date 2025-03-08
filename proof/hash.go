package main

import (
	"math/big"

	crypto_mimc "github.com/consensys/gnark-crypto/ecc/bn254/fr/mimc"
)

// MiMCHash computes a MiMC hash of the provided inputs
func MiMCHash(inputs ...*big.Int) *big.Int {
	h := crypto_mimc.NewMiMC() // frontend.APIが必要だが、ここではnilを渡す
	for _, input := range inputs {
		// Write the bytes of the input.
		h.Write(input.Bytes())
	}
	return new(big.Int).SetBytes(h.Sum(nil))
}

// createDeposit creates a deposit commitment hash
func createDeposit(secret, nullifier *big.Int, asset AssetType, amount *big.Int) *big.Int {
	return MiMCHash(secret, nullifier, asset.ID, amount)
}

// computeNullifierHash computes the nullifier hash using the nullifier and asset ID
func computeNullifierHash(nullifier, assetID *big.Int) *big.Int {
	return MiMCHash(nullifier, assetID)
}
