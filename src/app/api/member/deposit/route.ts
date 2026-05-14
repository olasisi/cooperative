import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { initializeTransaction } from "@/lib/paystack";
import { depositSchema } from "@/lib/validations";
import { generateReference } from "@/lib/utils";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id as string;
    const body = await req.json();
    const parsed = depositSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { amount } = parsed.data;
    const reference = generateReference("DEP");

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    const result = await initializeTransaction({
      email: user.email,
      amount,
      reference,
      metadata: { userId, type: "DEPOSIT" },
      callback_url: `${process.env.NEXTAUTH_URL}/api/paystack/verify?reference=${reference}`,
    });

    return NextResponse.json({ success: true, data: result.data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
