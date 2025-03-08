// Type definitions for withdrawal functionality
import { type Log } from "viem";

// Re-export Log type from viem for use in other files
export type { Log };

// Transaction receipt type for log processing
export interface TransactionReceipt {
  logs: Log[];
  blockNumber?: bigint;
  [key: string]: unknown;
}

// Define AbiParameter recursively to handle nested components
export interface AbiParameter {
  name: string;
  type: string;
  indexed?: boolean;
  internalType?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  components?: readonly AbiParameter[];
}

export interface AbiItem {
  type: string;
  name?: string;
  inputs?: readonly AbiParameter[];
  outputs?: readonly AbiParameter[];
  stateMutability?: string;
  anonymous?: boolean;
}

export type ContractArgs = readonly (
  | string
  | number
  | bigint
  | boolean
  | readonly (string | number | bigint | boolean)[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | Record<string, unknown>
)[];

export interface ContractWriteParams {
  abi: readonly AbiItem[];
  address: `0x${string}`;
  functionName: string;
  args: ContractArgs;
  [key: string]: unknown; // Allow for additional parameters that wagmi might use
}

export type WriteContractFunction = (params: ContractWriteParams) => void;

// Proof type for ZK proofs
export type ZKProof = readonly [
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint
];

// Parameter types for withdraw transaction
export interface WithdrawParams {
  recipient: string;
  formattedNullifierHash: `0x${string}`;
  formattedRoot: `0x${string}`;
  assetId: bigint;
  amount: bigint;
}

// Note parsed from withdraw note
export interface ParsedNote {
  token?: string;
  nullifier?: string;
  assetId?: number | string;
  amount?: number | string;
  secret?: string;
  commitment?: string;
  [key: string]: unknown;
}
