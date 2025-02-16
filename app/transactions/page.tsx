import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// This would typically come from an API or database
const transactions = [
  {
    id: 1,
    type: "Deposit",
    amount: "1.5",
    token: "ETH",
    date: "2023-05-01",
    status: "Confirmed",
    blockNumber: 12345678,
  },
  {
    id: 2,
    type: "Withdraw",
    amount: "100",
    token: "DAI",
    date: "2023-05-03",
    status: "Pending",
    blockNumber: null,
  },
  {
    id: 3,
    type: "Deposit",
    amount: "500",
    token: "USDC",
    date: "2023-05-05",
    status: "Confirmed",
    blockNumber: 12345680,
  },
  // Add more mock transactions as needed
];

export default function Transactions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Token</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Block Number</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell>{tx.type}</TableCell>
                <TableCell>{tx.amount}</TableCell>
                <TableCell>{tx.token}</TableCell>
                <TableCell>{tx.date}</TableCell>
                <TableCell>{tx.status}</TableCell>
                <TableCell>{tx.blockNumber || "Pending"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
