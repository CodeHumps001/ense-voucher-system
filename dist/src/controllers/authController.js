"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.resetPassword = exports.forgotPassword = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const emailServices_1 = require("../services/emailServices");
const prisma_1 = require("../lib/prisma");
// Register User
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existingUser)
            return res.status(400).json({ error: "User already exists" });
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.prisma.user.create({
            data: { name, email, password: hashedPassword, role: "STAFF" },
        });
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || "supersecret", { expiresIn: "1d" });
        res.status(201).json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        res.status(500).json({ error: "Registration failed" });
    }
};
exports.register = register;
// Login User
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user)
            return res.status(400).json({ error: "Invalid email or password" });
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch)
            return res.status(400).json({ error: "Invalid email or password" });
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || "supersecret", { expiresIn: "1d" });
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                isTemporaryPassword: user.isTemporaryPassword,
            },
        });
    }
    catch (error) {
        res.status(500).json({ error: "Login failed" });
    }
};
exports.login = login;
// 1. Forgot Password - Request Reset Link via Brevo
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        // For security reasons, don't reveal if the email exists or not
        if (!user) {
            return res.status(200).json({
                message: "If that email exists, a password reset link has been sent.",
            });
        }
        // Generate secure token valid for 1 hour
        const resetToken = crypto_1.default.randomBytes(32).toString("hex");
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: { resetToken, resetTokenExpiry },
        });
        const resetLink = `https://expense-voucher.vercel.app/auth/reset-password?token=${resetToken}`;
        await (0, emailServices_1.sendEmail)({
            toEmail: user.email,
            toName: user.name,
            subject: "Password Reset Request",
            htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Password Reset Request</h2>
          <p>Hello ${user.name},</p>
          <p>You requested to reset your password. Click the link below to proceed:</p>
          <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
          <p>This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
        </div>
      `,
        });
        res.json({
            message: "If that email exists, a password reset link has been sent.",
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to process password reset request" });
    }
};
exports.forgotPassword = forgotPassword;
// 2. Reset Password - Confirm with Token
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        const user = await prisma_1.prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: { gte: new Date() },
            },
        });
        if (!user) {
            return res
                .status(400)
                .json({ error: "Invalid or expired password reset token" });
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                isTemporaryPassword: false,
                resetToken: null,
                resetTokenExpiry: null,
            },
        });
        res.json({
            message: "Password has been reset successfully. You can now log in.",
        });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to reset password" });
    }
};
exports.resetPassword = resetPassword;
// 3. Change Password (For Logged-in users / Temporary Password update)
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user?.id;
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            return res.status(404).json({ error: "User not found" });
        const isMatch = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isMatch)
            return res.status(400).json({ error: "Incorrect current password" });
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                isTemporaryPassword: false,
            },
        });
        res.json({ message: "Password updated successfully" });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to change password" });
    }
};
exports.changePassword = changePassword;
