import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@expensesystem.com" },
    update: {},
    create: {
      email: "admin@expensesystem.com",
      name: "System Administrator",
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  console.log("Seeded Admin account:", admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
