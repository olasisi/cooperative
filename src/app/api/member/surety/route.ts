import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { suretyResponseSchema } from "@/lib/validations";
import { computeAvailableBalance } from "@/lib/utils";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id as string;

    const suretyRequests = await prisma.suretyRequest.findMany({
      where: { suretyId: userId },
      include: {
        loanRequest: {
          include: { borrower: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { requestedAt: "desc" },
    });

    const data = suretyRequests.map((s) => ({
      id: s.id,
      loanId: s.loanRequestId,
      borrowerName: `${s.loanRequest.borrower.firstName} ${s.loanRequest.borrower.lastName}`,
      amount: Number(s.loanRequest.amount),
      status: s.status,
    }));

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id as string;

    const body = await req.json();
    const parsed = suretyResponseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }
    const { action } = parsed.data;
    const { suretyId: suretyRequestId } = body as { suretyId: string };

    const suretyReq = await prisma.suretyRequest.findFirst({
      where: { id: suretyRequestId, suretyId: userId, status: "PENDING" },
      include: { loanRequest: true },
    });

    if (!suretyReq) {
      return NextResponse.json({ success: false, error: "Surety request not found" }, { status: 404 });
    }

    if (action === "ACCEPT") {
      const suretyWallet = await prisma.wallet.findUnique({ where: { userId } });
      if (!suretyWallet) return NextResponse.json({ success: false, error: "Wallet not found" }, { status: 404 });

      const available = computeAvailableBalance(suretyWallet.totalBalance, suretyWallet.lockedBalance);
      const amountToLock = Number(suretyReq.amountToLock);

      if (available < amountToLock) {
        return NextResponse.json({
          success: false,
          error: `Insufficient available balance. Need ₦${amountToLock.toFixed(2)}`,
        }, { status: 400 });
      }

      await prisma.$transaction([
        prisma.suretyRequest.update({
          where: { id: suretyRequestId },
          data: { status: "ACCEPTED", respondedAt: new Date(), lockedAt: new Date() },
        }),
        prisma.wallet.update({
          where: { userId },
          data: { lockedBalance: { increment: amountToLock } },
        }),
      ]);
    } else {
      await prisma.suretyRequest.update({
        where: { id: suretyRequestId },
        data: { status: "REJECTED", respondedAt: new Date() },
      });
      await prisma.loanRequest.update({
        where: { id: suretyReq.loanRequestId },
        data: { status: "CANCELLED" },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
