"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    const hashedPassword = await bcryptjs_1.default.hash("admin123", 10);
    const admin = await prisma.user.upsert({
        where: { email: "admin@expensesystem.com" },
        update: {},
        create: {
            email: "admin@expensesystem.com",
            name: "System Administrator",
            password: hashedPassword,
            role: client_1.Role.ADMIN,
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
