import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import { AuthRequest } from "../middleware/authMiddleware";
import { sendEmail } from "../services/emailServices";

const prisma = new PrismaClient();

// Register User
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser)
      return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: "STAFF" },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "supersecret",
      { expiresIn: "1d" },
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Registration failed" });
  }
};

// Login User
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user)
      return res.status(400).json({ error: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ error: "Invalid email or password" });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "supersecret",
      { expiresIn: "1d" },
    );

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
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
};

// 1. Forgot Password - Request Reset Link via Brevo
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    // For security reasons, don't reveal if the email exists or not
    if (!user) {
      return res.status(200).json({
        message: "If that email exists, a password reset link has been sent.",
      });
    }

    // Generate secure token valid for 1 hour
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    const resetLink = `http://localhost:3000/auth/reset-password?token=${resetToken}`;

    await sendEmail({
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to process password reset request" });
  }
};

// 2. Reset Password - Confirm with Token
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    const user = await prisma.user.findFirst({
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

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
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
  } catch (error) {
    res.status(500).json({ error: "Failed to reset password" });
  }
};

// 3. Change Password (For Logged-in users / Temporary Password update)
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ error: "Incorrect current password" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        isTemporaryPassword: false,
      },
    });

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to change password" });
  }
};
