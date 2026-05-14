import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateReference } from "@/lib/utils";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const user = session.user as { role?: string };
    if (user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

    const [loanRequests, withdrawalRequests, duesRequests] = await Promise.all([
      prisma.loanRequest.findMany({
        where: { status: "PROPOSED" },
        include: { borrower: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.withdrawalRequest.findMany({
        where: { status: "PROPOSED" },
        include: { user: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.duesRequest.findMany({
        where: { status: "PROPOSED" },
        include: { user: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const requests = [
      ...loanRequests.map((r) => ({
        id: r.id,
        type: "LOAN" as const,
        userName: `${r.borrower.firstName} ${r.borrower.lastName}`,
        amount: r.amount,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        details: r.purpose,
      })),
      ...withdrawalRequests.map((r) => ({
        id: r.id,
        type: "WITHDRAWAL" as const,
        userName: `${r.user.firstName} ${r.user.lastName}`,
        amount: r.amount,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        details: r.reason ?? "",
      })),
      ...duesRequests.map((r) => ({
        id: r.id,
        type: "DUES" as const,
        userName: `${r.user.firstName} ${r.user.lastName}`,
        amount: r.amount,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        details: `${r.month}/${r.year}`,
      })),
    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return NextResponse.json({ success: true, data: requests });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const adminUser = session.user as { id?: string; role?: string };
    if (adminUser.role !== "ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

    const adminId = adminUser.id!;
    const { requestId, requestType, action, comment } = await req.json() as {
      requestId: string;
      requestType: "LOAN" | "WITHDRAWAL" | "DUES";
      action: "APPROVE" | "REJECT";
      comment?: string;
    };

    if (!requestId || !requestType || !action) {
      return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
    }

    await prisma.approvalAction.create({
      data: { requestId, requestType, action, actorId: adminId, comment },
    });

    const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

    if (requestType === "LOAN") {
      const loan = await prisma.loanRequest.findUnique({ where: { id: requestId } });
      if (!loan) return NextResponse.json({ success: false, error: "Loan not found" }, { status: 404 });
      if (loan.status !== "PROPOSED") {
        return NextResponse.json({ success: false, error: "Loan is not in PROPOSED status" }, { status: 400 });
      }

      if (action === "APPROVE") {
        await prisma.$transaction(async (tx) => {
          await tx.loanRequest.update({
            where: { id: requestId },
            data: { status: "APPROVED", approvedById: adminId, approvedAt: new Date() },
          });

          const walletRecord = await tx.wallet.findUnique({ where: { userId: loan.borrowerId } });
          if (!walletRecord) throw new Error("Borrower wallet not found");

          const balanceBefore = Number(walletRecord.totalBalance);
          const ref = generateReference("LOAN");

          await tx.wallet.update({
            where: { userId: loan.borrowerId },
            data: { totalBalance: { increment: loan.amount } },
          });

          await tx.transaction.create({
            data: {
              walletId: walletRecord.id,
              userId: loan.borrowerId,
              type: "LOAN_DISBURSEMENT",
              amount: loan.amount,
              balanceBefore,
              balanceAfter: balanceBefore + Number(loan.amount),
              reference: ref,
              description: `Loan disbursement - ${loan.purpose}`,
              status: "COMPLETED",
              requestId: loan.id,
              requestType: "LOAN",
            },
          });
        });
      } else {
        await prisma.loanRequest.update({
          where: { id: requestId },
          data: { status: "REJECTED", rejectedAt: new Date(), rejectionReason: comment },
        });
      }
    } else if (requestType === "WITHDRAWAL") {
      const withdrawal = await prisma.withdrawalRequest.findUnique({ where: { id: requestId } });
      if (!withdrawal) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

      if (action === "APPROVE") {
        await prisma.$transaction(async (tx) => {
          const wallet = await tx.wallet.findUnique({ where: { userId: withdrawal.userId } });
          if (!wallet) throw new Error("Wallet not found");

          await tx.wallet.update({
            where: { userId: withdrawal.userId },
            data: { totalBalance: { decrement: withdrawal.amount } },
          });

          await tx.transaction.create({
            data: {
              walletId: wallet.id,
              userId: withdrawal.userId,
              type: "WITHDRAWAL",
              amount: withdrawal.amount,
              balanceBefore: wallet.totalBalance,
              balanceAfter: Number(wallet.totalBalance) - Number(withdrawal.amount),
              reference: generateReference("WIT"),
              description: withdrawal.reason ?? "Withdrawal",
              status: "COMPLETED",
              requestId: withdrawal.id,
              requestType: "WITHDRAWAL",
            },
          });

          await tx.withdrawalRequest.update({
            where: { id: requestId },
            data: { status: "APPROVED", approvedById: adminId, approvedAt: new Date() },
          });
        });
      } else {
        await prisma.withdrawalRequest.update({
          where: { id: requestId },
          data: { status: "REJECTED", rejectedAt: new Date(), rejectionReason: comment },
        });
      }
    } else if (requestType === "DUES") {
      const dues = await prisma.duesRequest.findUnique({ where: { id: requestId } });
      if (!dues) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

      if (action === "APPROVE") {
        await prisma.$transaction(async (tx) => {
          const wallet = await tx.wallet.findUnique({ where: { userId: dues.userId } });
          if (!wallet) throw new Error("Wallet not found");

          await tx.wallet.update({
            where: { userId: dues.userId },
            data: { totalBalance: { increment: dues.amount } },
          });

          await tx.transaction.create({
            data: {
              walletId: wallet.id,
              userId: dues.userId,
              type: "DUES_DEDUCTION",
              amount: dues.amount,
              balanceBefore: wallet.totalBalance,
              balanceAfter: Number(wallet.totalBalance) + Number(dues.amount),
              reference: generateReference("DUES"),
              description: `Dues payment ${dues.month}/${dues.year}`,
              status: "COMPLETED",
              requestId: dues.id,
              requestType: "DUES",
            },
          });

          await tx.duesRequest.update({
            where: { id: requestId },
            data: { status: "APPROVED", approvedById: adminId },
          });
        });
      } else {
        await prisma.duesRequest.update({
          where: { id: requestId },
          data: { status: "REJECTED" },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
