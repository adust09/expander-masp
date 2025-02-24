export const TORNADO_CONTRACT_ADDRESS =
  "0x73511669fd4de447fed18bb79bafeac93ab7f31f";
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
    stateMutability: "payable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "nullifierHash", type: "bytes32" },
      { name: "root", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;
