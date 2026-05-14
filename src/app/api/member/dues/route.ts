import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { duesPaymentSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id as string;

    const body = await req.json();
    const parsed = duesPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { amount, month, year } = parsed.data;

    const existing = await prisma.duesRequest.findFirst({
      where: { userId, month, year, status: { in: ["PROPOSED", "REVIEWED", "APPROVED", "EXECUTED"] } },
    });

    if (existing) {
      return NextResponse.json({
        success: false,
        error: "Dues for this month/year already submitted",
      }, { status: 400 });
    }

    const dues = await prisma.duesRequest.create({
      data: { userId, amount, month, year, status: "PROPOSED" },
    });

    return NextResponse.json({ success: true, data: dues }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
