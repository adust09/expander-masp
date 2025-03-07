// Utility functions for withdrawal functionality

import { keccak256, decodeEventLog, type Log } from "viem";
import { getBalance, readContract } from "@wagmi/core";
import type { Config } from "@wagmi/core";
import { ABI, TORNADO_CONTRACT_ADDRESS } from "@/constants/contract";
import { TOKENS, getTokenById } from "@/constants/tokens";
import { ParsedNote } from "./types";

// Define transaction receipt type to avoid 'any'
interface TransactionReceipt {
  logs: Log[];
  blockNumber?: bigint;
  [key: string]: unknown;
}

// Interface for decoded event arguments
interface WithdrawalEventArgs {
  to: string;
  nullifier: string;
  root: string;
  assetId?: bigint;
  amount?: bigint;
  [key: string]: unknown;
}

// Interface for decoded event
interface DecodedEvent {
  args: WithdrawalEventArgs;
  [key: string]: unknown;
}

/**
 * Parse a withdraw note from JSON
 * @param note Note string in JSON format
 * @param setSelectedToken Function to set token state
 * @param setNullifierHash Function to set nullifier hash state
 * @param setMessage Function to update UI message state
 * @returns Parsed note object or null if parsing failed
 */
export const parseWithdrawNote = (
  note: string,
  setSelectedToken: (token: string) => void,
  setNullifierHash: (hash: string) => void,
  setMessage: (value: React.SetStateAction<string>) => void
): ParsedNote | null => {
  try {
    const parsedNote = JSON.parse(note);

    // Set the form fields based on the note
    if (parsedNote.token) {
      setSelectedToken(parsedNote.token);
    }

    if (parsedNote.nullifier) {
      // Convert nullifier to hash
      const nullifierBytes = new Uint8Array(
        parsedNote.nullifier
          .match(/.{1,2}/g)
          .map((byte: string) => parseInt(byte, 16))
      );
      const assetIdBigInt = BigInt(parsedNote.assetId || 1);

      // Create a byte array for the asset ID (32 bytes, big-endian)
      const assetIdBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        assetIdBytes[31 - i] = Number(
          (assetIdBigInt >> BigInt(i * 8)) & BigInt(0xff)
        );
      }

      // Combine nullifier and assetId for the nullifier hash
      const combined = new Uint8Array(
        nullifierBytes.length + assetIdBytes.length
      );
      combined.set(nullifierBytes);
      combined.set(assetIdBytes, nullifierBytes.length);

      // Generate the nullifier hash
      const hash = keccak256(combined);
      setNullifierHash(hash);
    }

    return parsedNote;
  } catch (error) {
    console.error("Error parsing withdraw note:", error);
    setMessage("Invalid withdraw note format. Please check and try again.");
    return null;
  }
};

/**
 * Process transaction logs to find and decode withdrawal events
 * @param txReceipt Transaction receipt
 * @param setTxLogs Function to set transaction logs state
 * @param setMessage Function to update UI message state
 * @param recipient Recipient address
 */
export const processWithdrawalEvents = (
  txReceipt: TransactionReceipt,
  setTxLogs: (logs: Log[]) => void,
  setMessage: (value: React.SetStateAction<string>) => void,
  recipient: string
): void => {
  try {
    console.log("Transaction receipt:", txReceipt);

    // Extract logs from the transaction receipt
    if (txReceipt.logs && txReceipt.logs.length > 0) {
      console.log("Transaction logs:", txReceipt.logs);
      setTxLogs(txReceipt.logs);

      // Try to decode the Withdrawal event
      // Calculate the correct event signature hash dynamically
      const eventSignatureText =
        "Withdrawal(address,bytes32,bytes32,uint256,uint256)";
      // Convert the text to a hex string for keccak256
      const eventSignatureHex = `0x${Buffer.from(eventSignatureText).toString(
        "hex"
      )}`;
      const calculatedHash = keccak256(eventSignatureHex as `0x${string}`);

      console.log("Event signature:", eventSignatureText);
      console.log("Calculated hash:", calculatedHash);

      // Try both our calculated hash and a few alternatives
      const withdrawalEventSignature = calculatedHash;
      const alternativeHash =
        "0xe9e508bad6d4c3227e881ca19068f099da81b5164dd6d62b2eaf1e8bc6c34931";

      console.log(
        "Looking for event with signature:",
        withdrawalEventSignature
      );
      console.log("Alternative hash:", alternativeHash);

      const withdrawalEvent = txReceipt.logs.find((log: Log) => {
        console.log("Checking log topic:", log.topics?.[0]);
        return (
          log.topics &&
          (log.topics[0] === withdrawalEventSignature ||
            log.topics[0] === alternativeHash)
        );
      });

      // Log all topics for debugging
      console.log("All log topics:");
      txReceipt.logs.forEach((log: Log, index: number) => {
        console.log(`Log #${index + 1} topics:`, log.topics);

        // Try to identify if this could be our event by checking if the second topic (first indexed param)
        // is an address that matches our recipient
        if (log.topics && log.topics.length >= 2 && log.topics[1]) {
          const possibleAddress = "0x" + log.topics[1].slice(26); // Extract the last 40 chars (20 bytes) for address
          console.log(
            `Log #${index + 1} possible address:`,
            possibleAddress,
            "Our recipient:",
            recipient
          );
        }
      });

      return processFoundEvent(withdrawalEvent, txReceipt, setMessage);
    } else {
      console.log("No logs found in transaction receipt");
      setTxLogs([]);
      setMessage((prev) => prev + "\nNo logs found in transaction receipt.");
    }
  } catch (error) {
    console.error("Error processing events:", error);
    setMessage(
      (prev) => prev + "\nError processing events: " + JSON.stringify(error)
    );
  }
};

/**
 * Process a found withdrawal event
 * @param withdrawalEvent The event object if found
 * @param txReceipt Full transaction receipt
 * @param setMessage Function to update UI message state
 */
const processFoundEvent = (
  withdrawalEvent: Log | undefined,
  txReceipt: TransactionReceipt,
  setMessage: (value: React.SetStateAction<string>) => void
): void => {
  if (withdrawalEvent) {
    console.log("Withdrawal event found:", withdrawalEvent);

    try {
      // Try to decode the event data
      const decodedEvent = decodeWithdrawalEvent(withdrawalEvent);

      // Get token info based on assetId
      const assetId = Number(decodedEvent.args.assetId || 0);
      const token = getTokenById(assetId);
      const amount = decodedEvent.args.amount
        ? (Number(decodedEvent.args.amount) / 10 ** token.decimals).toString()
        : "unknown";

      console.log("Decoded Withdrawal event:", decodedEvent);
      setMessage(
        (prev) =>
          prev +
          "\nWithdrawal event found and decoded!" +
          "\nTo: " +
          decodedEvent.args.to +
          "\nNullifier: " +
          decodedEvent.args.nullifier +
          "\nRoot: " +
          decodedEvent.args.root +
          "\nAsset: " +
          token.symbol +
          "\nAmount: " +
          amount
      );
    } catch (decodeError) {
      console.error("Error decoding event:", decodeError);
      setMessage(
        (prev) => prev + "\nWithdrawal event found but could not be decoded."
      );
    }
  } else {
    console.log("No Withdrawal event found with exact signature");
    handleFallbackEventDecoding(txReceipt, setMessage);
  }
};

/**
 * Attempt to decode event data with a fallback approach
 * @param txReceipt Transaction receipt
 * @param setMessage Function to update UI message state
 */
const handleFallbackEventDecoding = (
  txReceipt: TransactionReceipt,
  setMessage: (value: React.SetStateAction<string>) => void
): void => {
  // Try a fallback approach - look for any event with 3 indexed parameters
  const possibleWithdrawalEvent = txReceipt.logs.find(
    (log: Log) => log.topics && log.topics.length === 4 // 1 for event signature + 3 indexed params
  );

  if (possibleWithdrawalEvent) {
    console.log(
      "Found possible Withdrawal event by structure:",
      possibleWithdrawalEvent
    );
    setMessage(
      (prev) =>
        prev +
        "\nPossible Withdrawal event found by structure (3 indexed parameters)."
    );

    try {
      // Try to decode it assuming it's our event
      const decodedEvent = decodeWithdrawalEvent(possibleWithdrawalEvent);

      console.log("Decoded possible Withdrawal event:", decodedEvent);
      setMessage(
        (prev) =>
          prev +
          "\nPossible Withdrawal event decoded!" +
          "\nTo: " +
          (decodedEvent.args.to || "unknown") +
          "\nNullifier: " +
          (decodedEvent.args.nullifier || "unknown") +
          "\nRoot: " +
          (decodedEvent.args.root || "unknown") +
          "\nAsset ID: " +
          (decodedEvent.args.assetId || "unknown") +
          "\nAmount: " +
          (decodedEvent.args.amount || "unknown")
      );
    } catch (decodeError) {
      console.error("Error decoding possible event:", decodeError);
    }
  } else {
    console.log("No event with 3 indexed parameters found");
    setMessage((prev) => prev + "\nNo Withdrawal event found in logs.");
  }
};

/**
 * Decode a withdrawal event from log data
 * @param event Event log data
 * @returns Decoded event
 */
const decodeWithdrawalEvent = (event: Log): DecodedEvent => {
  // Use the imported decodeEventLog function from viem
  return decodeEventLog({
    abi: [
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
    ],
    data: event.data,
    topics: event.topics || [],
  }) as DecodedEvent;
};

/**
 * Fetch and update contract balance
 * @param config Wagmi config
 * @param setContractBalance Function to set contract balance state
 * @param setAssetBalances Function to set asset balances state
 * @param setIsFetchingBalance Function to set loading state
 * @returns Contract balance or null if fetch failed
 */
export const fetchContractBalance = async (
  config: Config,
  setContractBalance: (balance: string) => void,
  setAssetBalances: (balances: Record<string, string>) => void,
  setIsFetchingBalance: (loading: boolean) => void
): Promise<number | null> => {
  setIsFetchingBalance(true);
  try {
    // Get ETH balance using getBalance
    const balance = await getBalance(config, {
      address: TORNADO_CONTRACT_ADDRESS as `0x${string}`,
      unit: "ether",
      blockTag: "latest",
    });
    console.log("Contract ETH balance from getBalance:", balance);

    // Also try to get balance directly from the contract's contractBalance function
    try {
      const contractBalance = await readContract(config, {
        address: TORNADO_CONTRACT_ADDRESS as `0x${string}`,
        abi: ABI,
        functionName: "contractBalance",
      });

      // Convert from wei to ether
      const contractBalanceEther = Number(contractBalance) / 10 ** 18;
      console.log(
        "Contract balance from contractBalance function:",
        contractBalanceEther
      );

      // Use the contract's balance if available
      setContractBalance(contractBalanceEther.toFixed(4) + " ETH");

      // Fetch balances for all tokens
      const newAssetBalances: Record<string, string> = {};

      for (const token of TOKENS) {
        try {
          const assetBalance = await readContract(config, {
            address: TORNADO_CONTRACT_ADDRESS as `0x${string}`,
            abi: ABI,
            functionName: "getAssetBalance",
            args: [BigInt(token.id)],
          });

          const formattedBalance = (
            Number(assetBalance) /
            10 ** token.decimals
          ).toFixed(4);
          newAssetBalances[token.symbol] =
            formattedBalance + " " + token.symbol;
        } catch (error) {
          console.error(`Error fetching ${token.symbol} balance:`, error);
          newAssetBalances[token.symbol] = "Error";
        }
      }

      setAssetBalances(newAssetBalances);
      return contractBalanceEther;
    } catch (contractError) {
      console.error(
        "Error getting balance from contract function:",
        contractError
      );
      // Fall back to getBalance result
      setContractBalance(String(balance) + " ETH");
      return Number(balance);
    }
  } catch (error) {
    console.error("Error fetching balance:", error);
    setContractBalance("Error fetching balance");
    return null;
  } finally {
    setIsFetchingBalance(false);
  }
};
