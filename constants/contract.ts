export const TORNADO_CONTRACT_ADDRESS = "0xb581c9264f59bf0289fa76d61b2d0746dce3c30d";

export const ABI = [
  {
    type: "function",
    name: "depositEth",
    stateMutability: "payable",
    inputs: [
      { name: "commitment", type: "bytes32" },
      { name: "assetId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "depositERC20",
    stateMutability: "nonpayable",
    inputs: [
      { name: "commitment", type: "bytes32" },
      { name: "assetId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "tokenAddress", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "nullifierHash", type: "bytes32" },
      { name: "root", type: "bytes32" },
      { name: "assetId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "proof", type: "uint256[8]" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getCurrentRoot",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "root", type: "bytes32" }],
  },
  {
    type: "function",
    name: "contractBalance",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "balance", type: "uint256" }],
  },
  {
    type: "function",
    name: "getAssetBalance",
    stateMutability: "view",
    inputs: [{ name: "assetId", type: "uint256" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
  {
    type: "event",
    name: "Deposit",
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "commitment", type: "bytes32" },
      { indexed: true, name: "newRoot", type: "bytes32" },
      { indexed: false, name: "assetId", type: "uint256" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "Withdrawal",
    inputs: [
      { indexed: true, name: "to", type: "address" },
      { indexed: true, name: "nullifier", type: "bytes32" },
      { indexed: true, name: "root", type: "bytes32" },
      { indexed: false, name: "assetId", type: "uint256" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
  },
] as const;

// Note: This is a mock ABI for the frontend implementation
// The actual contract would need to be updated to support these functions
