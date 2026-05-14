import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loanRequestSchema } from "@/lib/validations";
import { computeAvailableBalance } from "@/lib/utils";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id as string;
    const loans = await prisma.loanRequest.findMany({
      where: { borrowerId: userId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: loans });
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
    const parsed = loanRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { amount, purpose, tenure, suretyId } = parsed.data;

    if (suretyId === userId) {
      return NextResponse.json({ success: false, error: "You cannot be your own surety" }, { status: 400 });
    }

    const [wallet, settings, suretyWallet, suretyUser] = await Promise.all([
      prisma.wallet.findUnique({ where: { userId } }),
      prisma.settings.findMany(),
      prisma.wallet.findUnique({ where: { userId: suretyId } }),
      prisma.user.findUnique({ where: { id: suretyId } }),
    ]);

    if (!wallet) return NextResponse.json({ success: false, error: "Wallet not found" }, { status: 404 });
    if (!suretyUser || !suretyWallet) {
      return NextResponse.json({ success: false, error: "Surety member not found" }, { status: 404 });
    }

    const settingsMap = Object.fromEntries(settings.map((s) => [s.key, parseFloat(s.value)]));
    const maxLoanMultiplier = settingsMap["maxLoanMultiplier"] ?? 2;
    const suretyMultiplier = settingsMap["suretyMultiplier"] ?? 2;

    const maxLoan = Number(wallet.totalBalance) * maxLoanMultiplier;
    if (amount > maxLoan) {
      return NextResponse.json({
        success: false,
        error: `Loan amount exceeds maximum of ${maxLoanMultiplier}x your balance (₦${maxLoan.toFixed(2)})`,
      }, { status: 400 });
    }

    const suretyAvailable = computeAvailableBalance(suretyWallet.totalBalance, suretyWallet.lockedBalance);
    if (suretyAvailable < amount * suretyMultiplier) {
      return NextResponse.json({
        success: false,
        error: `Surety must have at least ${suretyMultiplier}x the loan amount as available balance`,
      }, { status: 400 });
    }

    const interestRate = settingsMap["interestRate"] ?? 5;

    const loan = await prisma.loanRequest.create({
      data: {
        borrowerId: userId,
        amount,
        purpose,
        tenure,
        interestRate,
        status: "PROPOSED",
        proposedById: userId,
        suretyRequests: {
          create: {
            suretyId,
            borrowerId: userId,
            amountToLock: amount * (settingsMap["suretyMultiplier"] ?? 2),
            status: "PENDING",
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: loan }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
