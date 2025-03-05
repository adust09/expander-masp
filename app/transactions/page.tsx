"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Hourglass } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Transaction {
  id: number;
  type: string;
  amount: string;
  token: string;
  date: string;
  status: string;
  blockNumber: number | null;
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching data from an API
    setTimeout(() => {
      const mockTransactions: Transaction[] = [
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

      setTransactions(mockTransactions);
      setIsLoading(false);
    }, 500);
  }, []);

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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  <Hourglass className="mr-2 inline-block animate-spin" />
                  Loading transactions...
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{tx.type}</TableCell>
                  <TableCell>{tx.amount}</TableCell>
                  <TableCell>{tx.token}</TableCell>
                  <TableCell>{tx.date}</TableCell>
                  <TableCell>{tx.status}</TableCell>
                  <TableCell>
                    {tx.blockNumber === null ? "Pending" : tx.blockNumber}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
