"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TransactionType, TransactionStatus } from "@prisma/client";

interface TxRow {
  id: string;
  type: TransactionType;
  amount: number;
  description?: string | null;
  status: TransactionStatus;
  reference: string;
  createdAt: string;
}

const typeLabels: Record<string, string> = {
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  LOAN_DISBURSEMENT: "Loan Disbursement",
  LOAN_REPAYMENT: "Loan Repayment",
  DUES_PAYMENT: "Dues Payment",
  ADJUSTMENT: "Adjustment",
  SURETY_LOCK: "Surety Lock",
  SURETY_RELEASE: "Surety Release",
};

const statusVariants: Record<string, "default" | "success" | "destructive" | "warning"> = {
  PENDING: "warning",
  COMPLETED: "success",
  FAILED: "destructive",
  REVERSED: "destructive",
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/member/transactions")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setTransactions(data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transactions</h1>
        <p className="text-muted-foreground">Full transaction history</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : transactions.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No transactions yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div className="font-medium">{typeLabels[tx.type] ?? tx.type}</div>
                      {tx.description && (
                        <div className="text-xs text-muted-foreground">{tx.description}</div>
                      )}
                    </TableCell>
                    <TableCell
                      className={
                        ["DEPOSIT", "LOAN_DISBURSEMENT"].includes(tx.type)
                          ? "text-green-600 font-medium"
                          : "text-red-600 font-medium"
                      }
                    >
                      {["DEPOSIT", "LOAN_DISBURSEMENT"].includes(tx.type) ? "+" : "-"}
                      {formatCurrency(tx.amount)}
                    </TableCell>
                    <TableCell className="text-xs font-mono">{tx.reference}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[tx.status] ?? "default"}>{tx.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(tx.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
