import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TransactionType, TransactionStatus } from "@prisma/client";

interface Transaction {
  id: string;
  type: TransactionType;
  amount: number | { toNumber(): number };
  description?: string | null;
  status: TransactionStatus;
  createdAt: Date;
  reference: string;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
}

const typeLabels: Record<TransactionType, string> = {
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  LOAN_DISBURSEMENT: "Loan",
  LOAN_REPAYMENT: "Repayment",
  DUES_DEDUCTION: "Dues",
  ADJUSTMENT: "Adjustment",
  SURETY_LOCK: "Surety Lock",
  SURETY_RELEASE: "Surety Release",
  REFUND: "Refund",
};

const statusVariants: Record<TransactionStatus, "default" | "success" | "destructive" | "warning"> = {
  PENDING: "warning",
  COMPLETED: "success",
  FAILED: "destructive",
  REVERSED: "destructive",
};

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No transactions yet
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((tx) => (
          <TableRow key={tx.id}>
            <TableCell>
              <div className="font-medium">{typeLabels[tx.type]}</div>
              {tx.description && (
                <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                  {tx.description}
                </div>
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
            <TableCell>
              <Badge variant={statusVariants[tx.status]}>{tx.status}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {formatDate(tx.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
