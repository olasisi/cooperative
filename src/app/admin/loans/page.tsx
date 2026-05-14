import { prisma } from "@/lib/db";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminLoansPage() {
  const loans = await prisma.loanRequest.findMany({
    include: {
      borrower: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const statusVariant: Record<string, "default" | "success" | "destructive" | "warning" | "info"> = {
    PROPOSED: "warning",
    REVIEWED: "info",
    APPROVED: "success",
    EXECUTED: "success",
    REJECTED: "destructive",
    CANCELLED: "destructive",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Loans</h1>
        <p className="text-muted-foreground">{loans.length} loan requests</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Loan Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Tenure</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Repaid</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell>
                    <div className="font-medium">
                      {loan.borrower.firstName} {loan.borrower.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">{loan.borrower.email}</div>
                  </TableCell>
                  <TableCell>{formatCurrency(loan.amount)}</TableCell>
                  <TableCell className="max-w-[120px] truncate text-xs">{loan.purpose}</TableCell>
                  <TableCell>{loan.tenure} months</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[loan.status] ?? "default"}>{loan.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={loan.isRepaid ? "success" : "warning"}>
                      {loan.isRepaid ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(loan.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
