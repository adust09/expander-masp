package main

import (
	"math/big"
)

// TreeDepth is the number of levels in the Merkle tree.
// In a production circuit, this would typically be much larger.
const TreeDepth = 3

// Define some example asset types
var (
	ETH  = AssetType{ID: big.NewInt(1), Symbol: "ETH"}
	DAI  = AssetType{ID: big.NewInt(2), Symbol: "DAI"}
	USDC = AssetType{ID: big.NewInt(3), Symbol: "USDC"}
	USDT = AssetType{ID: big.NewInt(4), Symbol: "USDT"}
)
