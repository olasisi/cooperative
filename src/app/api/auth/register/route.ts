import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validations";
import { generateMembershipNumber } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { email, password, firstName, lastName, phoneNumber, address, nextOfKin, nextOfKinPhone } =
      parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ success: false, error: "Email already registered" }, { status: 400 });
    }

    const memberCount = await prisma.user.count({ where: { role: "MEMBER" } });
    const membershipNumber = generateMembershipNumber(memberCount + 1);
    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashed,
          firstName,
          lastName,
          phoneNumber,
          address,
          nextOfKin,
          nextOfKinPhone,
          membershipNumber,
          role: "MEMBER",
        },
      });
      await tx.wallet.create({
        data: { userId: newUser.id, totalBalance: 0, lockedBalance: 0 },
      });
      return newUser;
    });

    return NextResponse.json({
      success: true,
      data: { id: user.id, email: user.email, membershipNumber: user.membershipNumber },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
