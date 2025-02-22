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
import { TOKENS } from "@/constants/tokens";
import { keccak256 } from "viem";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { getBalance } from "@wagmi/core";
import { config } from "../../config";

const TornadoAbi = [
  {
    type: "function",
    name: "deposit",
    stateMutability: "payable",
    inputs: [{ name: "commitment", type: "bytes32" }],
    outputs: [],
  },
] as const;

const TORNADO_CONTRACT_ADDRESS = "0x43ca3d2c94be00692d207c6a1e60d8b325c6f12f";

export default function Deposit() {
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState(TOKENS[0].symbol);
  const { address, isConnected } = useAccount();
  const [hasBalance, setHasBalance] = useState(false);
  const [commitment, setCommitment] = useState<`0x${string}`>();
  const [currentRoot, setCurrentRoot] = useState<`0x${string}` | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchBalance = async () => {
      if (address) {
        const balance = await getBalance(config, {
          address: address as `0x${string}`,
          unit: "ether",
          blockTag: "latest",
        });
        setHasBalance(!!balance);
      }
    };
    fetchBalance();
  }, [address]);

  function generateCommitment() {
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const nullifier = crypto.getRandomValues(new Uint8Array(32));

    const combined = new Uint8Array(secret.length + nullifier.length);
    combined.set(secret);
    combined.set(nullifier, secret.length);

    const commitment = keccak256(combined);
    return commitment;
  }

  const { data: depositTxData, writeContract } = useWriteContract({
    config,
  });

  const { isSuccess: isTxDone } = useWaitForTransactionReceipt({
    hash: depositTxData as `0x${string}`,
  });

  const { data: latestRoot, refetch: refetchLatestRoot } = useReadContract({
    address: TORNADO_CONTRACT_ADDRESS,
    abi: TornadoAbi,
    functionName: "getLatestRoot",
  });

  console.log("latestRoot:", latestRoot);

  async function handleDeposit() {
    if (isConnected && hasBalance && amount !== "") {
      console.log("Generating commitment...");
      try {
        const c = generateCommitment();
        setCommitment(c);
        console.log("Commitment generated:", commitment);
        setTimeout(() => {
          writeContract({
            abi: TornadoAbi,
            address: TORNADO_CONTRACT_ADDRESS,
            functionName: "deposit",
            args: [c],
          });
        }, 100);
      } catch (error) {
        console.error("Deposit failed:", error);
      }
    }
  }

  async function handleRoot() {
    console.log("Fetching latest root...");
    await refetchLatestRoot();
    if (latestRoot) {
      console.log("Latest root fetched:", latestRoot);
      setMessage(`latestRoot is ${latestRoot}`);
    }
    setCurrentRoot(latestRoot ?? null);
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Deposit Funds</CardTitle>
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
        <p className="break-all text-sm">Generated commitment: {commitment}</p>
        <p className="break-all text-sm text-green-600">
          Current Root: {currentRoot}
        </p>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full bg-purple-600 hover:bg-purple-700"
          onClick={handleDeposit}
        >
          <ArrowRightLeft className="mr-2" /> Deposit {selectedToken}
        </Button>
        {isTxDone && (
          <Button
            className="bg-gray-600 hover:bg-gray-700"
            onClick={handleRoot}
          >
            Get Latest Root
          </Button>
        )}
        {latestRoot && (
          <p className="text-sm text-green-600 break-all">{message}</p>
        )}
      </CardFooter>
    </Card>
  );
}
