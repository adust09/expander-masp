"use client";

import { useEffect, useState } from "react";
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
import { ArrowRightLeft } from "lucide-react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { isAddress, zeroAddress, decodeEventLog, keccak256, toHex } from "viem";
import { getBalance, readContract } from "@wagmi/core";
import { config } from "../../config";
import { ABI, TORNADO_CONTRACT_ADDRESS } from "@/constants/contract";
import { TOKENS, getTokenById, getTokenId } from "@/constants/tokens";

export default function Withdraw() {
  const [selectedToken, setSelectedToken] = useState(TOKENS[0].symbol);
  const [recipient, setRecipient] = useState("");
  const [nullifierHash, setNullifierHash] = useState("");
  const [root, setRoot] = useState("");
  const [message, setMessage] = useState("");
  const [withdrawNote, setWithdrawNote] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [txLogs, setTxLogs] = useState<any[]>([]);
  const [contractBalance, setContractBalance] = useState<string>("Loading...");
  const [assetBalances, setAssetBalances] = useState<Record<string, string>>(
    {}
  );

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
        // Use type assertion since TypeScript doesn't know the error structure
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errorWithReceipt = err as any;
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

  useEffect(() => {
    const fetchTxLogs = async () => {
      if (isWithdrawSuccess && isTxDone && txReceipt) {
        try {
          console.log("Transaction receipt:", txReceipt);

          // Extract logs from the transaction receipt
          if (txReceipt.logs && txReceipt.logs.length > 0) {
            console.log("Transaction logs:", txReceipt.logs);
            setTxLogs(txReceipt.logs);

            // Try to decode the Withdrawal event
            // Calculate the correct event signature hash dynamically
            const eventSignature =
              "Withdrawal(address,bytes32,bytes32,uint256,uint256)";
            const calculatedHash = keccak256(toHex(eventSignature));

            console.log("Event signature:", eventSignature);
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

            const withdrawalEvent = txReceipt.logs.find((log) => {
              console.log("Checking log topic:", log.topics?.[0]);
              return (
                log.topics &&
                (log.topics[0] === withdrawalEventSignature ||
                  log.topics[0] === alternativeHash)
              );
            });

            // Log all topics for debugging
            console.log("All log topics:");
            txReceipt.logs.forEach((log, index) => {
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

            if (withdrawalEvent) {
              console.log("Withdrawal event found:", withdrawalEvent);

              try {
                // Try to decode the event data
                const decodedEvent = decodeEventLog({
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
                  data: withdrawalEvent.data,
                  topics: withdrawalEvent.topics || [],
                });

                // Get token info based on assetId
                const assetId = Number(decodedEvent.args.assetId || 0);
                const token = getTokenById(assetId);
                const amount = decodedEvent.args.amount
                  ? (
                      Number(decodedEvent.args.amount) /
                      10 ** token.decimals
                    ).toString()
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
                  (prev) =>
                    prev + "\nWithdrawal event found but could not be decoded."
                );
              }
            } else {
              console.log("No Withdrawal event found with exact signature");

              // Try a fallback approach - look for any event with 3 indexed parameters
              const possibleWithdrawalEvent = txReceipt.logs.find(
                (log) => log.topics && log.topics.length === 4 // 1 for event signature + 3 indexed params
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
                  const decodedEvent = decodeEventLog({
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
                    data: possibleWithdrawalEvent.data,
                    topics: possibleWithdrawalEvent.topics || [],
                  });

                  console.log(
                    "Decoded possible Withdrawal event:",
                    decodedEvent
                  );
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
                setMessage(
                  (prev) => prev + "\nNo Withdrawal event found in logs."
                );
              }
            }
          } else {
            console.log("No logs found in transaction receipt");
            setTxLogs([]);
            setMessage(
              (prev) => prev + "\nNo logs found in transaction receipt."
            );
          }
        } catch (error) {
          console.error("Error fetching transaction logs:", error);
          setMessage(
            (prev) =>
              prev +
              "\nError fetching transaction logs: " +
              JSON.stringify(error)
          );
        }

        alert("Withdraw transaction completed");
      }
    };

    fetchTxLogs();
  }, [isWithdrawSuccess, isTxDone, txReceipt]);

  if (isWithdrawError && withdrawError) {
    console.error("Withdraw error details:", withdrawError);
  }

  // Function to fetch and update contract balance
  const fetchBalance = async () => {
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
        return balance;
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
      setContractBalance("Error fetching balance");
      return null;
    }
  };

  // Fetch balance on component mount
  useEffect(() => {
    fetchBalance();
  }, []);

  // Refetch balance after transaction completion
  useEffect(() => {
    if (isWithdrawSuccess && isTxDone) {
      fetchBalance();
    }
  }, [isWithdrawSuccess, isTxDone]);

  // Parse the withdraw note
  const parseWithdrawNote = (note: string) => {
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

  async function handleWithdraw() {
    // Clear previous logs when starting a new withdrawal
    setTxLogs([]);
    setMessage("Preparing withdrawal...");

    // If a withdraw note is provided, parse it
    let parsedNote = null;
    if (withdrawNote) {
      parsedNote = parseWithdrawNote(withdrawNote);
      if (!parsedNote) return;
    }

    if (!root || !nullifierHash || !recipient) {
      alert("Please fill in root, nullifierHash, recipient");
      return;
    }
    if (!isAddress(recipient) || recipient === zeroAddress) {
      alert("Invalid recipient address");
      return;
    }
    if (!writeContract) {
      alert("Withdraw not ready (wagmi hook not initialized?)");
      return;
    }
    try {
      // Get asset ID and amount
      const assetId = parsedNote
        ? BigInt(parsedNote.assetId)
        : BigInt(getTokenId(selectedToken));
      const amount = parsedNote
        ? BigInt(parsedNote.amount)
        : BigInt(1000000000000000000); // Default to 1 token unit

      // Generate ZK proof for withdrawal
      setMessage((prev) => prev + "\nGenerating zero-knowledge proof...");

      // Prepare proof input data
      // In a real implementation, we would have the actual secret and Merkle proof
      // For now, we'll use placeholder values
      const secret = parsedNote?.secret || "123"; // This would come from the note
      const nullifierValue = parsedNote?.nullifier || "456"; // This would come from the note

      // Mock Merkle proof data - in a real implementation, this would be computed or retrieved
      const merkleProof = ["789", "101112", "131415"];
      const pathIndices = [0, 0, 0];

      try {
        // Call our API to generate the proof
        const proofResponse = await fetch("/api/createWithdrawalProof", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            secret,
            nullifier: nullifierValue,
            assetId: assetId.toString(),
            amount: amount.toString(),
            merkleProof,
            pathIndices,
          }),
        });

        if (!proofResponse.ok) {
          const errorData = await proofResponse.json();
          throw new Error(`Failed to generate proof: ${errorData.error}`);
        }

        const proofData = await proofResponse.json();
        setMessage((prev) => prev + "\nProof generated successfully!");

        // Log the proof data
        console.log("Generated proof data:", proofData);

        // In a real implementation, we would use the proof data in the contract call
        // For now, we'll proceed with the existing parameters
      } catch (proofError) {
        console.error("Error generating proof:", proofError);
        setMessage(
          (prev) =>
            prev +
            `\nError generating proof: ${
              proofError instanceof Error
                ? proofError.message
                : String(proofError)
            }`
        );
        // Continue with the withdrawal even if proof generation fails
        // In a production environment, you might want to abort instead
      }

      // Log the parameters we're sending to the contract
      console.log("Withdraw parameters:", {
        recipient,
        nullifierHash,
        root,
        assetId: assetId.toString(),
        amount: amount.toString(),
        contractAddress: TORNADO_CONTRACT_ADDRESS,
      });

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

      setMessage((prev) => prev + "\nSubmitting withdrawal transaction...");
      setTimeout(() => {
        writeContract({
          abi: ABI,
          address: TORNADO_CONTRACT_ADDRESS,
          functionName: "withdraw",
          args: [
            recipient,
            formattedNullifierHash,
            formattedRoot,
            assetId,
            amount,
            // In a real implementation with proof verification enabled in the contract,
            // we would include the proof data here
          ],
        });
      }, 100);
    } catch (err) {
      console.error("handleWithdraw error:", err);
      const errorMessage =
        err instanceof Error ? err.message : JSON.stringify(err);
      setMessage(`Withdraw failed: ${errorMessage}`);
      alert(`Withdraw failed: ${errorMessage}`);
    }
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Withdraw Funds (MASP)</CardTitle>
        <div className="mt-2 text-sm font-medium flex items-center justify-between">
          <div>
            Contract Balance:{" "}
            <span className="text-green-600">{contractBalance}</span>
          </div>
          <button
            onClick={() => fetchBalance()}
            className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
          >
            Refresh
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
          <Label htmlFor="withdrawNote">Withdraw Note (Optional)</Label>
          <textarea
            id="withdrawNote"
            className="w-full p-2 border rounded h-24 text-xs"
            placeholder="Paste your withdraw note here"
            value={withdrawNote}
            onChange={(e) => setWithdrawNote(e.target.value)}
          />
          <p className="text-xs text-gray-500">
            If you have a withdraw note from your deposit, paste it here to
            automatically fill the form.
          </p>
        </div>

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
        >
          <ArrowRightLeft className="mr-2" /> Withdraw {selectedToken}
        </Button>
      </CardFooter>
    </Card>
  );
}
