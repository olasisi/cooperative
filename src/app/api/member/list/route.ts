import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id as string;

    const members = await prisma.user.findMany({
      where: { role: "MEMBER", isActive: true, NOT: { id: userId } },
      select: { id: true, firstName: true, lastName: true, membershipNumber: true },
      orderBy: { firstName: "asc" },
    });

    return NextResponse.json({ success: true, data: members });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
