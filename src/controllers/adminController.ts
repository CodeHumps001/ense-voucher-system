import { Response } from "express";

import { AuthRequest } from "../middleware/authMiddleware";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendEmail } from "../services/emailServices";
import { prisma } from "../lib/prisma";

// Create Staff or Admin Member (Admin Only)
export const createStaffMember = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "Unauthorized: Admin privileges required" });
    }

    const { email, name, password, role } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "User with this email already exists" });
    }

    // Use admin-provided password or fall back to a random temporary one
    const activePassword = password || crypto.randomBytes(4).toString("hex");
    const hashedPassword = await bcrypt.hash(activePassword, 10);
    const assignedRole = role === "ADMIN" ? "ADMIN" : "STAFF";

    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: assignedRole,
        isTemporaryPassword: !password,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    try {
      await sendEmail({
        toEmail: email,
        toName: name,
        subject: "Your Expense System Credentials",
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Welcome to the Expense Management System, ${name}</h2>
            <p>An administrator has created an account for you as a <strong>${assignedRole}</strong>.</p>
            <p>Your login credentials are:</p>
            <ul>
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>Password:</strong> ${activePassword}</li>
            </ul>
            <p>Please log in and change your password immediately for security purposes.</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Failed to dispatch welcome email:", emailErr);
    }

    return res.status(201).json({
      success: true,
      message: "User account created and credentials dispatched successfully",
      user: newUser,
    });
  } catch (error) {
    console.error("Create user error:", error);
    return res.status(500).json({ error: "Failed to create user member" });
  }
};

// Fetch All Users / Staff Members (Admin Only)
export const getAllStaff = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "Unauthorized: Admin privileges required" });
    }

    const staff = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, users: staff });
  } catch (error) {
    console.error("Fetch users error:", error);
    return res.status(500).json({ error: "Failed to fetch staff members" });
  }
};
