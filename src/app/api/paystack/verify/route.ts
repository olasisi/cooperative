import { NextRequest, NextResponse } from "next/server";
import { verifyTransaction, koboToNaira } from "@/lib/paystack";
import { prisma } from "@/lib/db";
import { generateReference } from "@/lib/utils";
import { redirect } from "next/navigation";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get("reference");

  if (!reference) {
    return NextResponse.redirect(new URL("/member/wallet?error=missing_ref", req.url));
  }

  try {
    const result = await verifyTransaction(reference);

    if (result.data.status !== "success") {
      return NextResponse.redirect(new URL("/member/wallet?error=payment_failed", req.url));
    }

    const userId = result.data.metadata?.userId as string | undefined;
    if (!userId) {
      return NextResponse.redirect(new URL("/member/wallet?error=invalid_metadata", req.url));
    }

    const existing = await prisma.transaction.findFirst({ where: { paystackRef: reference } });
    if (!existing) {
      const amountNaira = koboToNaira(result.data.amount);
      const wallet = await prisma.wallet.findUnique({ where: { userId } });
      if (wallet) {
        await prisma.$transaction([
          prisma.wallet.update({
            where: { userId },
            data: { totalBalance: { increment: amountNaira } },
          }),
          prisma.transaction.create({
            data: {
              walletId: wallet.id,
              userId,
              type: "DEPOSIT",
              amount: amountNaira,
              balanceBefore: wallet.totalBalance,
              balanceAfter: Number(wallet.totalBalance) + amountNaira,
              reference: generateReference("DEP"),
              paystackRef: reference,
              description: "Paystack deposit",
              status: "COMPLETED",
            },
          }),
        ]);
      }
    }

    return NextResponse.redirect(new URL("/member/wallet?success=1", req.url));
  } catch (err) {
    console.error(err);
    return NextResponse.redirect(new URL("/member/wallet?error=server_error", req.url));
  }
}
