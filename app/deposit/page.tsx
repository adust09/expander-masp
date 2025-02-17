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
import { useAccount, useWriteContract } from "wagmi";
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

const TORNADO_CONTRACT_ADDRESS = "0x73511669fd4de447fed18bb79bafeac93ab7f31f";

export default function Deposit() {
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState(TOKENS[0].symbol);
  const [hasBalance, setHasBalance] = useState(false);
  const { writeContract } = useWriteContract();
  const account = useAccount({
    config,
  });

  useEffect(() => {
    const fetchBalance = async () => {
      if (account.address) {
        const balance = await getBalance(config, {
          address: account.address as `0x${string}`,
          unit: "ether",
          blockTag: "latest",
        });
        setHasBalance(!!balance);
      }
    };
    fetchBalance();
  }, [account.address]);

  function generateCommitment() {
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const nullifier = crypto.getRandomValues(new Uint8Array(32));

    const combined = new Uint8Array(secret.length + nullifier.length);
    combined.set(secret);
    combined.set(nullifier, secret.length);

    const commitment = keccak256(combined);
    return commitment;
  }

  async function handleDeposit() {
    if (account.isConnecting && hasBalance && amount !== "") {
      console.log("Generating commitment...");
      try {
        const commitment = generateCommitment();
        console.log("Commitment generated:", commitment);
        if (selectedToken === "ETH") {
          const tx = writeContract({
            abi: TornadoAbi,
            address: TORNADO_CONTRACT_ADDRESS,
            functionName: "deposit",
            args: [commitment],
          });

          console.log("Deposit tx sent:", tx);
        } else {
          alert("ERC20 deposit not implemented in this example.");
        }
      } catch (err) {
        console.error("Deposit failed:", err);
        alert(`Deposit failed: ${String(err)}`);
      }
    } else {
      alert("Please connect your wallet and ensure you have a balance.");
      if (amount === "") {
        alert("Please enter an amount to deposit.");
      }
    }
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
      </CardContent>
      <CardFooter>
        <Button
          className="w-full bg-purple-600 hover:bg-purple-700"
          onClick={handleDeposit}
        >
          <ArrowRightLeft className="mr-2" /> Deposit {selectedToken}
        </Button>
      </CardFooter>
    </Card>
  );
}
