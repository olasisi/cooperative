import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const adminPassword = await bcrypt.hash("Admin@1234", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@cooperative.com" },
    update: {},
    create: {
      email: "admin@cooperative.com",
      password: adminPassword,
      firstName: "System",
      lastName: "Admin",
      role: "ADMIN",
      membershipNumber: "COOP-ADMIN",
      isActive: true,
      isEmailVerified: true,
    },
  });

  console.log(`Admin created: ${admin.email}`);

  const settings = [
    { key: "minApprovals", value: "2", description: "Minimum approvals required" },
    { key: "suretyMultiplier", value: "2", description: "Surety balance multiplier" },
    { key: "maxLoanMultiplier", value: "2", description: "Max loan = N * member balance" },
    { key: "interestRate", value: "5", description: "Annual interest rate (%)" },
    { key: "minMembershipMonths", value: "3", description: "Min months before loan eligibility" },
  ];

  for (const setting of settings) {
    await prisma.settings.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log("Default settings seeded.");

  const memberPassword = await bcrypt.hash("Member@1234", 12);

  const member1 = await prisma.user.upsert({
    where: { email: "john.doe@example.com" },
    update: {},
    create: {
      email: "john.doe@example.com",
      password: memberPassword,
      firstName: "John",
      lastName: "Doe",
      phoneNumber: "08012345678",
      role: "MEMBER",
      membershipNumber: "COOP-2024-0001",
      isActive: true,
      isEmailVerified: true,
    },
  });

  await prisma.wallet.upsert({
    where: { userId: member1.id },
    update: {},
    create: { userId: member1.id, totalBalance: 50000, lockedBalance: 0 },
  });

  console.log(`Sample member created: ${member1.email}`);
  console.log("\nSeed complete!");
  console.log("Admin login: admin@cooperative.com / Admin@1234");
  console.log("Member login: john.doe@example.com / Member@1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
