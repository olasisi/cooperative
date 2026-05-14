import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature, koboToNaira } from "@/lib/paystack";
import { prisma } from "@/lib/db";
import { generateReference } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text();
    const signature = req.headers.get("x-paystack-signature") ?? "";

    if (!verifyWebhookSignature(payload, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(payload) as {
      event: string;
      data: {
        status: string;
        reference: string;
        amount: number;
        customer: { email: string };
        metadata?: { userId?: string; type?: string };
      };
    };

    if (event.event === "charge.success") {
      const { reference, amount, metadata } = event.data;
      const userId = metadata?.userId;
      if (!userId) return NextResponse.json({ received: true });

      const amountNaira = koboToNaira(amount);
      const wallet = await prisma.wallet.findUnique({ where: { userId } });
      if (!wallet) return NextResponse.json({ received: true });

      const existing = await prisma.transaction.findFirst({ where: { paystackRef: reference } });
      if (existing) return NextResponse.json({ received: true });

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

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
