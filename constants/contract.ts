export const TORNADO_CONTRACT_ADDRESS =
  "0xb581c9264f59bf0289fa76d61b2d0746dce3c30d";
export const ABI = [
  {
    type: "function",
    name: "deposit",
    stateMutability: "payable",
    inputs: [{ name: "commitment", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getCurrentRoot",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "nullifierHash", type: "bytes32" },
      { name: "root", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "contractBalance",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;
