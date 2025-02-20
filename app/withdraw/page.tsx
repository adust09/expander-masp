"use client";

import { useState } from "react";
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
import { useWriteContract } from "wagmi";
import { isAddress, zeroAddress } from "viem"; // optional validation helpers
import { config } from "../../config";
const TornadoAbi = [
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [
      { name: "root", type: "bytes32" },
      { name: "nullifierHash", type: "bytes32" },
      { name: "recipient", type: "address" },
    ],
  },
] as const;

const TORNADO_CONTRACT_ADDRESS = "0x43ca3d2c94be00692d207c6a1e60d8b325c6f12f";

export default function Withdraw() {
  const [root, setRoot] = useState("");
  const [selectedToken, setSelectedToken] = useState(TOKENS[0].symbol);
  const [recipient, setRecipient] = useState("");
  const [nullifierHash, setNullifierHash] = useState("");

  const { isSuccess: isWithdrawSuccess, writeContract } = useWriteContract({
    config,
  });

  console.log("withdrawError", isWithdrawSuccess);

  const handleWithdraw = () => {
    // todo
    // if (!isConnected) {
    //   alert("Wallet not connected!");
    //   return;
    // }
    if (selectedToken !== "ETH") {
      alert("This contract only supports ETH (fixed 1ETH) withdraw");
      return;
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

    writeContract({
      abi: TornadoAbi,
      address: TORNADO_CONTRACT_ADDRESS,
      functionName: "withdraw",
      args: [
        root as `0x${string}`,
        nullifierHash as `0x${string}`,
        recipient as `0x${string}`,
      ],
    });
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Withdraw Funds</CardTitle>
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
          <Label htmlFor="root">Root</Label>
          <Input
            id="root"
            placeholder="bytes32 root (0x...)"
            value={root}
            onChange={(e) => setRoot(e.target.value)}
          />
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
          <Label htmlFor="note">Privacy Note</Label>
          <Input
            id="note"
            placeholder="Enter privacy note"
            value={nullifierHash}
            onChange={(e) => setNullifierHash(e.target.value)}
          />
        </div>
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
