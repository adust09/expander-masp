"use client";

import { useEffect, useState } from "react";
import { Hourglass, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { config } from "../../config";
import { TORNADO_CONTRACT_ADDRESS, ABI } from "@/constants/contract";
import { TOKENS, getTokenId } from "@/constants/tokens";
import type { TransactionReceipt, Log } from "./lib/types";

// Import utility functions from our library files
import { generateZKProof } from "./lib/proof";
import {
  validateWithdrawInputs,
  prepareWithdrawParams,
  executeWithdrawTransaction,
} from "./lib/contract";
import {
  parseWithdrawNote,
  processWithdrawalEvents,
  fetchContractBalance,
} from "./lib/utils";

// Define error type for wagmi error with potential receipt
interface ErrorWithReceipt {
  message?: string;
  receipt?: {
    logs?: Log[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export default function Withdraw() {
  const [selectedToken, setSelectedToken] = useState(TOKENS[0].symbol);
  const [recipient, setRecipient] = useState("");
  const [nullifierHash, setNullifierHash] = useState("");
  const [root, setRoot] = useState("");
  const [message, setMessage] = useState("");
  const [withdrawNote] = useState("");
  const [txLogs, setTxLogs] = useState<Log[]>([]);
  const [contractBalance, setContractBalance] = useState<string>("Loading...");
  const [assetBalances, setAssetBalances] = useState<Record<string, string>>(
    {}
  );
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isFetchingBalance, setIsFetchingBalance] = useState(false);

  const {
    data: withdrawData,
    isSuccess: isWithdrawSuccess,
    isError: isWithdrawError,
    error: withdrawError,
    writeContract,
  } = useWriteContract({
    config,
    mutation: {
      onError(err) {
        console.error("Withdraw onError callback:", err);
        setMessage(
          `Withdraw error (callback): ${err.message || JSON.stringify(err)}`
        );

        // Even if there's an error, we should check for events in the transaction receipt
        // The transaction might have failed after emitting the event
        const errorWithReceipt = err as ErrorWithReceipt;
        if (errorWithReceipt.receipt) {
          console.log("Error receipt:", errorWithReceipt.receipt);
          if (
            errorWithReceipt.receipt.logs &&
            errorWithReceipt.receipt.logs.length > 0
          ) {
            console.log("Error receipt logs:", errorWithReceipt.receipt.logs);
            setTxLogs(errorWithReceipt.receipt.logs);
          }
        }
      },
      onSuccess(data) {
        console.log("Withdraw tx sent:", data);
        setMessage("Withdraw transaction submitted!");
      },
    },
  });

  const { isSuccess: isTxDone, data: txReceipt } = useWaitForTransactionReceipt(
    {
      hash: withdrawData as `0x${string}`,
    }
  );

  // Process transaction logs when the transaction is completed
  useEffect(() => {
    if (isWithdrawSuccess && isTxDone && txReceipt) {
      processWithdrawalEvents(
        txReceipt as TransactionReceipt,
        setTxLogs,
        setMessage,
        recipient
      );

      alert("Withdraw transaction completed");
    }
  }, [isWithdrawSuccess, isTxDone, txReceipt, recipient]);

  // Log withdraw errors
  useEffect(() => {
    if (isWithdrawError && withdrawError) {
      console.error("Withdraw error details:", withdrawError);
    }
  }, [isWithdrawError, withdrawError]);

  // Fetch balance on component mount
  useEffect(() => {
    const loadBalance = async () => {
      await fetchContractBalance(
        config,
        setContractBalance,
        setAssetBalances,
        setIsFetchingBalance
      );
    };

    loadBalance();
  }, []);

  // Refetch balance after transaction completion
  useEffect(() => {
    if (isWithdrawSuccess && isTxDone) {
      fetchContractBalance(
        config,
        setContractBalance,
        setAssetBalances,
        setIsFetchingBalance
      );
    }
  }, [isWithdrawSuccess, isTxDone]);

  async function handleWithdraw() {
    setIsWithdrawing(true);
    // Clear previous logs when starting a new withdrawal
    setTxLogs([]);
    setMessage("Preparing withdrawal...");

    // If a withdraw note is provided, parse it
    let parsedNote = null;
    if (withdrawNote) {
      parsedNote = parseWithdrawNote(
        withdrawNote,
        setSelectedToken,
        setNullifierHash,
        setMessage
      );
      if (!parsedNote) {
        setIsWithdrawing(false);
        return;
      }
    }

    if (
      !validateWithdrawInputs(root, nullifierHash, recipient, writeContract)
    ) {
      setIsWithdrawing(false);
      return;
    }

    try {
      // Get asset ID and amount
      const assetId =
        parsedNote && parsedNote.assetId
          ? BigInt(parsedNote.assetId)
          : BigInt(getTokenId(selectedToken));
      const amount =
        parsedNote && parsedNote.amount
          ? BigInt(parsedNote.amount)
          : BigInt(1000000000000000000); // Default to 1 token unit

      // Prepare proof input data
      const secret = parsedNote?.secret || "123";
      const nullifierValue = parsedNote?.nullifier || "456";
      const commitment = parsedNote?.commitment || "789";
      console.log("secret:", secret);
      console.log("null:", nullifierValue);
      console.log("commitment", commitment);
      // Generate ZK proof
      const zkProof = await generateZKProof(
        secret,
        nullifierValue,
        assetId,
        amount,
        commitment,
        setMessage
      );

      // Format parameters for the contract call
      const params = prepareWithdrawParams(
        recipient,
        nullifierHash,
        root,
        assetId,
        amount
      );

      // Execute the withdrawal with a small delay to allow UI updates
      setTimeout(() => {
        executeWithdrawTransaction(
          writeContract,
          TORNADO_CONTRACT_ADDRESS,
          ABI,
          params,
          zkProof,
          setMessage
        );
      }, 100);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : JSON.stringify(err);
      setMessage(`Withdraw failed: ${errorMessage}`);
      alert(`Withdraw failed: ${errorMessage}`);
    } finally {
      setIsWithdrawing(false);
    }
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Withdraw Funds (MASP)</CardTitle>
        <div className="mt-2 text-sm font-medium flex items-center justify-between">
          <div>
            Contract Balance:{" "}
            {isFetchingBalance ? (
              <>
                <Hourglass className="mr-2 animate-spin" /> Loading...
              </>
            ) : (
              <span className="text-green-600">{contractBalance}</span>
            )}
          </div>
          <button
            onClick={() =>
              fetchContractBalance(
                config,
                setContractBalance,
                setAssetBalances,
                setIsFetchingBalance
              )
            }
            className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
            disabled={isFetchingBalance}
          >
            {isFetchingBalance ? (
              <>
                <Hourglass className="mr-2 animate-spin" /> Refreshing...
              </>
            ) : (
              "Refresh"
            )}
          </button>
        </div>

        {/* Display balances for all tokens */}
        <div className="mt-2 text-xs">
          <h3 className="font-medium mb-1">Asset Balances:</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(assetBalances).map(([symbol, balance]) => (
              <div key={symbol} className="flex justify-between">
                <span>{symbol}:</span>
                <span className="text-blue-600">{balance}</span>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="token">Select Token</Label>
          <Select value={selectedToken} onValueChange={setSelectedToken}>
            <SelectTrigger>
              <SelectValue placeholder="Select token" />
            </SelectTrigger>
            <SelectContent>
              {TOKENS.map((token) => (
                <SelectItem key={token.symbol} value={token.symbol}>
                  {token.name} ({token.symbol})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="recipient">Recipient Ethereum Address</Label>
          <Input
            id="recipient"
            placeholder="Enter Ethereum address (0x...)"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="note">Nullifier Hash</Label>
          <Input
            id="note"
            placeholder="Enter nullifier hash (0x...)"
            value={nullifierHash}
            onChange={(e) => setNullifierHash(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="root">Root</Label>
          <Input
            id="root"
            placeholder="bytes32 root (0x...)"
            value={root}
            onChange={(e) => setRoot(e.target.value)}
          />
        </div>
        {message && <p className="text-sm whitespace-pre-line">{message}</p>}

        {txLogs.length > 0 && (
          <div className="mt-4 border rounded p-3 bg-gray-50">
            <h3 className="font-medium mb-2">Transaction Logs:</h3>
            <div className="max-h-60 overflow-auto text-xs">
              {txLogs.map((log, index) => (
                <div key={index} className="mb-2 p-2 border-b">
                  <div>
                    <strong>Log #{index + 1}</strong>
                  </div>
                  <div>
                    <strong>Topics:</strong> {log.topics?.join(", ") || "None"}
                  </div>
                  <div>
                    <strong>Data:</strong> {log.data || "None"}
                  </div>
                  <div>
                    <strong>Block:</strong>{" "}
                    {String(log.blockNumber || "Unknown")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          className="w-full bg-purple-600 hover:bg-purple-700"
          onClick={handleWithdraw}
          disabled={isWithdrawing}
        >
          {isWithdrawing ? (
            <>
              <Hourglass className="mr-2 animate-spin" /> Withdrawing...
            </>
          ) : (
            <>
              <ArrowRightLeft className="mr-2" /> Withdraw {selectedToken}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
