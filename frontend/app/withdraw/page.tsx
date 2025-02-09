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

export default function Withdraw() {
  const [amount, setAmount] = useState("")
  const [selectedToken, setSelectedToken] = useState(TOKENS[0].symbol)
  const [recipient, setRecipient] = useState("")
  const [note, setNote] = useState("")
  const { address, connectWallet } = useWallet()

  const handleWithdraw = () => {
    // Implement withdraw logic here
    console.log("Withdraw:", { amount, token: selectedToken, recipient, note })
  }

  if (!address) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Connect Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center mb-4">Please connect your wallet to make a withdrawal.</p>
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
          <Label htmlFor="amount">Amount ({selectedToken})</Label>
          <Input
            id="amount"
            type="number"
            placeholder={`Enter amount in ${selectedToken}`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
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
          <Input id="note" placeholder="Enter privacy note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={handleWithdraw}>
          <ArrowRightLeft className="mr-2" /> Withdraw {selectedToken}
        </Button>
      </CardFooter>
    </Card>
  )
}

