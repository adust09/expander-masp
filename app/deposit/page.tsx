"use client";
import { useEffect, useState } from "react";
import { Hourglass } from "lucide-react";
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
import { keccak256, parseEther } from "viem";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { getBalance } from "@wagmi/core";
import { config } from "../../config";
import { ABI, TORNADO_CONTRACT_ADDRESS } from "@/constants/contract";
import { TOKENS, getTokenId, toTokenUnit } from "@/constants/tokens";

export default function Deposit() {
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState(TOKENS[0].symbol);
  const { address, isConnected } = useAccount();
  const [hasBalance, setHasBalance] = useState(false);
  const [commitment, setCommitment] = useState<`0x${string}`>();
  const [currentRoot, setCurrentRoot] = useState<`0x${string}`>();
  const [secret, setSecret] = useState<Uint8Array | null>(null);
  const [nullifier, setNullifier] = useState<Uint8Array | null>(null);
  const [isFetchingBalance, setIsFetchingBalance] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isFetchingRoot, setIsFetchingRoot] = useState(false);

  useEffect(() => {
    const fetchBalance = async () => {
      setIsFetchingBalance(true);
      try {
        if (address) {
          const balance = await getBalance(config, {
            address: address as `0x${string}`,
            unit: "ether",
            blockTag: "latest",
          });
          setHasBalance(!!balance);
        }
      } finally {
        setIsFetchingBalance(false);
      }
    };
    fetchBalance();
  }, [address]);

  function genCommitment() {
    // Generate random secret and nullifier
    const newSecret = crypto.getRandomValues(new Uint8Array(32));
    const newNullifier = crypto.getRandomValues(new Uint8Array(32));
    setSecret(newSecret);
    setNullifier(newNullifier);

    const assetId = getTokenId(selectedToken);
    const assetIdBigInt = BigInt(assetId);
    const assetIdBytes = new Uint8Array(32);
    const amountValue = toTokenUnit(amount, selectedToken);
    const amountBytes = new Uint8Array(32);

    for (let i = 0; i < 32; i++) {
      assetIdBytes[31 - i] = Number(
        (assetIdBigInt >> BigInt(i * 8)) & BigInt(0xff)
      );
      amountBytes[31 - i] = Number(
        (amountValue >> BigInt(i * 8)) & BigInt(0xff)
      );
    }

    const combined = new Uint8Array(
      newSecret.length +
        newNullifier.length +
        assetIdBytes.length +
        amountBytes.length
    );
    combined.set(newSecret);
    combined.set(newNullifier, newSecret.length);
    combined.set(assetIdBytes, newSecret.length + newNullifier.length);
    combined.set(
      amountBytes,
      newSecret.length + newNullifier.length + assetIdBytes.length
    );

    return keccak256(combined);
  }

  const { data: depositTxData, writeContract } = useWriteContract({
    config,
  });

  // We can still wait for the transaction receipt, but we don't need to store the success status
  useWaitForTransactionReceipt({
    hash: depositTxData as `0x${string}`,
  });

  const {
    refetch: refetchLatestRoot,
    isError,
    error,
  } = useReadContract({
    address: TORNADO_CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "getCurrentRoot",
  });

  async function handleDeposit() {
    if (isConnected && hasBalance && amount !== "") {
      setIsDepositing(true);
      console.log("Generating commitment...");
      try {
        const c = genCommitment();
        setCommitment(c);
        console.log("Commitment generated:", commitment);

        // Get asset ID for the selected token
        const assetId = getTokenId(selectedToken);
        const token = TOKENS.find((t) => t.symbol === selectedToken);

        setTimeout(() => {
          if (selectedToken === "ETH") {
            // For ETH deposits
            writeContract({
              abi: ABI,
              address: TORNADO_CONTRACT_ADDRESS,
              functionName: "depositEth",
              args: [c, BigInt(assetId)],
              value: parseEther(amount),
            });
          } else if (token && token.address) {
            // For ERC20 token deposits
            const tokenAmount = toTokenUnit(amount, selectedToken);

            writeContract({
              abi: ABI,
              address: TORNADO_CONTRACT_ADDRESS,
              functionName: "depositERC20",
              args: [
                c,
                BigInt(assetId),
                tokenAmount,
                token.address as `0x${string}`,
              ],
            });
          }
        }, 100);
        console.log("Deposit transaction sent.");
      } catch (error) {
        console.error("Deposit failed:", error);
      } finally {
        setIsDepositing(false);
      }
    }
  }

  async function handleRoot() {
    setIsFetchingRoot(true);
    try {
      console.log("Fetching latest root...");
      const result = await refetchLatestRoot();
      console.log("Latest root fetched:", result);

      // Handle the case where the result is a zero value (0x0000...0000)
      // This happens when the contract is newly deployed and no deposits have been made yet
      if (result.data !== undefined) {
        console.log("Latest root fetched:", result.data);
        // Even if it's a zero value, we should still set it
        setCurrentRoot(result.data as `0x${string}`);

        // If it's a zero value (all zeros), add a note for debugging
        if (
          result.data ===
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        ) {
          console.log(
            "Note: Root is a zero value, which is normal for a newly initialized contract"
          );
        }
      } else {
        console.warn("No root returned (result.data is undefined)");
      }

      if (isError) {
        console.error("Failed to fetch latest root:", isError);
        console.error("Error:", error);
      }
    } catch (err) {
      console.error("Unexpected error fetching root:", err);
      alert("Error fetching the current root. Please try again later.");
    } finally {
      setIsFetchingRoot(false);
    }
  }

  // Generate a note that the user can save to withdraw later
  function generateNote() {
    if (!secret || !nullifier || !commitment) return "";

    const secretHex = Array.from(secret)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const nullifierHex = Array.from(nullifier)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const assetId = getTokenId(selectedToken);
    const amountValue = toTokenUnit(amount, selectedToken).toString();

    return JSON.stringify({
      secret: secretHex,
      nullifier: nullifierHex,
      assetId,
      amount: amountValue,
      token: selectedToken,
      commitment: commitment.substring(2),
    });
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Deposit Funds (MASP)</CardTitle>
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
          <Label htmlFor="amount">Amount ({selectedToken})</Label>
          <Input
            id="amount"
            type="number"
            placeholder={`Enter amount in ${selectedToken}`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        {isFetchingBalance ? (
          <p className="break-all text-sm">Fetching balance...</p>
        ) : (
          <p className="break-all text-sm">
            Generated commitment: {commitment}
          </p>
        )}

        {commitment && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <h3 className="font-medium text-yellow-800 mb-2">
              Save this note to withdraw later:
            </h3>
            <textarea
              className="w-full h-24 p-2 text-xs bg-white border rounded"
              readOnly
              value={generateNote()}
            />
            <p className="text-xs text-yellow-700 mt-1">
              Keep this note private and secure. You will need it to withdraw
              your funds.
            </p>
          </div>
        )}

        <div className="space-y-1">
          <p className="break-all text-sm text-green-600">
            Current Root: {currentRoot || "Not fetched yet"}
          </p>
          {currentRoot ===
            "0x0000000000000000000000000000000000000000000000000000000000000000" && (
            <p className="text-xs text-amber-600">
              Note: Root is a zero value, which is normal for a newly
              initialized contract or if no deposits have been made yet.
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button
          className="w-full bg-purple-600 hover:bg-purple-700"
          onClick={handleDeposit}
          disabled={isDepositing}
        >
          {isDepositing ? (
            <>
              <Hourglass className="mr-2 animate-spin" /> Depositing...
            </>
          ) : (
            <>
              <ArrowRightLeft className="mr-2" /> Deposit {selectedToken}
            </>
          )}
        </Button>
        <Button
          className="w-full bg-gray-600 hover:bg-gray-700"
          onClick={handleRoot}
          disabled={isFetchingRoot}
        >
          {isFetchingRoot ? (
            <>
              <Hourglass className="mr-2 animate-spin" /> Fetching Root...
            </>
          ) : (
            "Get Latest Root"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
