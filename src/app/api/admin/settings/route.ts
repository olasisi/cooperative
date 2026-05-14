import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { settingsSchema } from "@/lib/validations";

const DEFAULT_SETTINGS = [
  { key: "minApprovals", value: "2", description: "Minimum approvals required for requests" },
  { key: "suretyMultiplier", value: "2", description: "Surety must have N times the loan amount" },
  { key: "maxLoanMultiplier", value: "2", description: "Max loan = N times member balance" },
  { key: "interestRate", value: "5", description: "Annual interest rate percentage" },
  { key: "minMembershipMonths", value: "3", description: "Min months of membership for loan eligibility" },
];

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const user = session.user as { role?: string };
    if (user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

    const settings = await prisma.settings.findMany();
    const settingsMap: Record<string, number> = {};

    for (const def of DEFAULT_SETTINGS) {
      const found = settings.find((s) => s.key === def.key);
      settingsMap[def.key] = parseFloat(found?.value ?? def.value);
    }

    return NextResponse.json({ success: true, data: settingsMap });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const user = session.user as { role?: string };
    if (user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    const updates = Object.entries(parsed.data);
    await Promise.all(
      updates.map(([key, value]) =>
        prisma.settings.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
