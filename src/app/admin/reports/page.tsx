import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminReportsPage() {
  const [
    totalDeposited,
    totalWithdrawn,
    totalLoansDisb,
    totalDues,
    memberCount,
    walletAgg,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      where: { type: "DEPOSIT", status: "COMPLETED" },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { type: "WITHDRAWAL", status: "COMPLETED" },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { type: "LOAN_DISBURSEMENT", status: "COMPLETED" },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { type: "DUES_DEDUCTION", status: "COMPLETED" },
      _sum: { amount: true },
    }),
    prisma.user.count({ where: { role: "MEMBER" } }),
    prisma.wallet.aggregate({ _sum: { totalBalance: true, lockedBalance: true } }),
  ]);

  const stats = [
    { title: "Total Deposited", value: totalDeposited._sum.amount ?? 0 },
    { title: "Total Withdrawn", value: totalWithdrawn._sum.amount ?? 0 },
    { title: "Loans Disbursed", value: totalLoansDisb._sum.amount ?? 0 },
    { title: "Dues Collected", value: totalDues._sum.amount ?? 0 },
    { title: "Current Pool Balance", value: walletAgg._sum.totalBalance ?? 0 },
    { title: "Total Locked (Sureties)", value: walletAgg._sum.lockedBalance ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground">Financial summary across {memberCount} members</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.title}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(s.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
