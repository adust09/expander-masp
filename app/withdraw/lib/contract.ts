// Functions for contract interaction and transaction handling

import {
  AbiItem,
  WithdrawParams,
  WriteContractFunction,
  ZKProof,
} from "./types";
import { isAddress, zeroAddress } from "viem";

/**
 * Validate input data before proceeding with withdrawal
 * @param root Merkle root
 * @param nullifierHash Nullifier hash
 * @param recipient Recipient address
 * @param writeContract Wagmi write contract function
 * @returns True if inputs are valid, false otherwise
 */
export const validateWithdrawInputs = (
  root: string,
  nullifierHash: string,
  recipient: string,
  writeContract: WriteContractFunction | undefined
): boolean => {
  if (!root || !nullifierHash || !recipient) {
    alert("Please fill in root, nullifierHash, recipient");
    return false;
  }
  if (!isAddress(recipient) || recipient === zeroAddress) {
    alert("Invalid recipient address");
    return false;
  }
  if (!writeContract) {
    alert("Withdraw not ready (wagmi hook not initialized?)");
    return false;
  }
  return true;
};

/**
 * Prepare parameters for withdrawal transaction
 * @param recipient Recipient address
 * @param nullifierHash Nullifier hash
 * @param root Merkle root
 * @param assetId Asset ID
 * @param amount Amount to withdraw
 * @returns Formatted parameters for contract interaction
 */
export const prepareWithdrawParams = (
  recipient: string,
  nullifierHash: string,
  root: string,
  assetId: bigint,
  amount: bigint
): WithdrawParams => {
  // Ensure nullifierHash and root are properly formatted as bytes32
  const formattedNullifierHash = nullifierHash.startsWith("0x")
    ? (nullifierHash as `0x${string}`)
    : (`0x${nullifierHash}` as `0x${string}`);
  const formattedRoot = root.startsWith("0x")
    ? (root as `0x${string}`)
    : (`0x${root}` as `0x${string}`);

  console.log("Formatted parameters:", {
    recipient,
    formattedNullifierHash,
    formattedRoot,
    assetId: assetId.toString(),
    amount: amount.toString(),
  });

  return {
    recipient,
    formattedNullifierHash,
    formattedRoot,
    assetId,
    amount,
  };
};

/**
 * Execute the withdrawal transaction
 * @param writeContract Contract write function
 * @param contractAddress Contract address
 * @param abi Contract ABI
 * @param params Withdrawal parameters
 * @param formattedProof ZK proof
 * @param setMessage Function to update UI message state
 */
export const executeWithdrawTransaction = (
  writeContract: WriteContractFunction,
  contractAddress: `0x${string}`,
  abi: readonly AbiItem[],
  params: WithdrawParams,
  formattedProof: ZKProof,
  setMessage: (value: React.SetStateAction<string>) => void
) => {
  setMessage((prev) => prev + "\nSubmitting withdrawal transaction...");

  console.log("🔍 Final contract call with proof:", {
    type: typeof formattedProof,
    isArray: Array.isArray(formattedProof),
    length: formattedProof.length,
    values: Array.from(formattedProof).map((v: bigint) => v.toString()),
  });

  writeContract({
    abi: abi,
    address: contractAddress,
    functionName: "withdraw",
    args: [
      params.recipient,
      params.formattedNullifierHash,
      params.formattedRoot,
      params.assetId,
      params.amount,
      formattedProof, // Already in the correct format
    ],
  });
};
