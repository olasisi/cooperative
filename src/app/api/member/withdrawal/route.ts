import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withdrawalRequestSchema } from "@/lib/validations";
import { computeAvailableBalance } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id as string;

    const body = await req.json();
    const parsed = withdrawalRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { amount, reason, bankName, accountNumber, accountName } = parsed.data;

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) return NextResponse.json({ success: false, error: "Wallet not found" }, { status: 404 });

    const available = computeAvailableBalance(wallet.totalBalance, wallet.lockedBalance);
    if (amount > available) {
      return NextResponse.json({
        success: false,
        error: `Insufficient available balance. Available: ₦${available.toFixed(2)}`,
      }, { status: 400 });
    }

    const withdrawal = await prisma.withdrawalRequest.create({
      data: {
        userId,
        amount,
        reason,
        bankName,
        accountNumber,
        accountName,
        status: "PROPOSED",
      },
    });

    return NextResponse.json({ success: true, data: withdrawal }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
