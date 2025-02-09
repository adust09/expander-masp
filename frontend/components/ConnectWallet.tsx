"use client"

import { Button } from "@/components/ui/button"
import { useWallet } from "@/contexts/WalletContext"

export function ConnectWallet() {
  const { address, connectWallet, disconnectWallet } = useWallet()

  if (address) {
    return (
      <Button variant="outline" onClick={disconnectWallet}>
        {address.slice(0, 6)}...{address.slice(-4)}
      </Button>
    )
  }

  return <Button onClick={connectWallet}>Connect Wallet</Button>
}

