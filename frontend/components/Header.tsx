import Link from "next/link"
import { Shield } from "lucide-react"
import { ConnectWallet } from "./ConnectWallet"

export default function Header() {
  return (
    <header className="bg-gray-800 py-4">
      <nav className="container mx-auto px-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold flex items-center">
          <Shield className="mr-2" />
          Privacy Mixer
        </Link>
        <ul className="flex items-center space-x-4">
          <li>
            <Link href="/deposit" className="hover:text-purple-400">
              Deposit
            </Link>
          </li>
          <li>
            <Link href="/withdraw" className="hover:text-purple-400">
              Withdraw
            </Link>
          </li>
          <li>
            <Link href="/transactions" className="hover:text-purple-400">
              Transactions
            </Link>
          </li>
          <li>
            <Link href="/compliance" className="hover:text-purple-400">
              Compliance
            </Link>
          </li>
          <li>
            <ConnectWallet />
          </li>
        </ul>
      </nav>
    </header>
  )
}

