export const TORNADO_CONTRACT_ADDRESS =
  "0x37dd26d18abec2d311e82177f9fa58e9dc14b579";
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
    name: "currentRoot",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "payable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "nullifierHash", type: "bytes32" },
      { name: "root", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;
