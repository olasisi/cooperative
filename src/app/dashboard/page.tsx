import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { computeAvailableBalance, formatCurrency } from "@/lib/utils";
import { StatsCard } from "@/components/dashboard/stats-card";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, CreditCard, ArrowUpDown, Clock } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id as string;
  const role = (session.user as { role?: string }).role;

  if (role === "ADMIN") redirect("/admin");

  const [wallet, activeLoanCount, recentTx, pendingSureties] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId } }),
    prisma.loanRequest.count({
      where: { borrowerId: userId, status: "APPROVED", isRepaid: false },
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.suretyRequest.count({
      where: { suretyId: userId, status: "PENDING" },
    }),
  ]);

  const totalBalance = Number(wallet?.totalBalance ?? 0);
  const lockedBalance = Number(wallet?.lockedBalance ?? 0);
  const availableBalance = computeAvailableBalance(totalBalance, lockedBalance);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your cooperative account</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Balance"
          value={totalBalance}
          isCurrency
          icon={Wallet}
          description="Total savings balance"
        />
        <StatsCard
          title="Available Balance"
          value={availableBalance}
          isCurrency
          icon={Wallet}
          description="Withdrawable balance"
        />
        <StatsCard
          title="Locked Balance"
          value={lockedBalance}
          isCurrency
          icon={CreditCard}
          description="Used as surety"
        />
        <StatsCard
          title="Active Loans"
          value={activeLoanCount}
          icon={ArrowUpDown}
          description="Outstanding loans"
        />
      </div>

      {pendingSureties > 0 && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-600" />
            <p className="text-sm font-medium text-yellow-800">
              You have {pendingSureties} pending surety request{pendingSureties > 1 ? "s" : ""}.{" "}
              <a href="/member/loans" className="underline">
                Review now
              </a>
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentTransactions transactions={recentTx} />
        </CardContent>
      </Card>
    </div>
  );
}
