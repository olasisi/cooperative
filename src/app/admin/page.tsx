import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Wallet, CreditCard, CheckSquare } from "lucide-react";

export default async function AdminDashboardPage() {
  const [
    totalMembers,
    activeMembers,
    walletAgg,
    activeLoans,
    pendingApprovals,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "MEMBER" } }),
    prisma.user.count({ where: { role: "MEMBER", isActive: true } }),
    prisma.wallet.aggregate({ _sum: { totalBalance: true } }),
    prisma.loanRequest.count({ where: { status: "APPROVED", isRepaid: false } }),
    prisma.loanRequest.count({ where: { status: "PROPOSED" } }).then(async (loans) => {
      const withdrawals = await prisma.withdrawalRequest.count({ where: { status: "PROPOSED" } });
      const dues = await prisma.duesRequest.count({ where: { status: "PROPOSED" } });
      return loans + withdrawals + dues;
    }),
  ]);

  const totalBalance = walletAgg._sum.totalBalance ? Number(walletAgg._sum.totalBalance) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Cooperative society management overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Total Members"
          value={totalMembers}
          icon={Users}
          description={`${activeMembers} active`}
        />
        <StatsCard
          title="Total Balance (Pool)"
          value={totalBalance}
          isCurrency
          icon={Wallet}
          description="Sum of all member balances"
        />
        <StatsCard
          title="Active Loans"
          value={activeLoans}
          icon={CreditCard}
          description="Disbursed, not fully repaid"
        />
        <StatsCard
          title="Pending Approvals"
          value={pendingApprovals}
          icon={CheckSquare}
          description="Awaiting review"
        />
      </div>
    </div>
  );
}
