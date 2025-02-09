"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowRightLeft } from "lucide-react"
import { TOKENS } from "@/constants/tokens"
import { useWallet } from "@/contexts/WalletContext"

export default function Deposit() {
  const [amount, setAmount] = useState("")
  const [selectedToken, setSelectedToken] = useState(TOKENS[0].symbol)
  const { address, connectWallet } = useWallet()

  const handleDeposit = () => {
    // Implement deposit logic here
    console.log("Deposit:", { amount, token: selectedToken })
  }

  if (!address) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Connect Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center mb-4">Please connect your wallet to make a deposit.</p>
          <Button className="w-full" onClick={connectWallet}>
            Connect Wallet
          </Button>
        </CardContent>
      </Card>
    )
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
        <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={handleDeposit}>
          <ArrowRightLeft className="mr-2" /> Deposit {selectedToken}
        </Button>
      </CardFooter>
    </Card>
  )
}

