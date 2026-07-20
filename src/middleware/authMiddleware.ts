import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: "ADMIN" | "STAFF";
    name: string;
  };
}

export const verifyToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.split(" ")[1]) || req.query.token;

  if (!token) return res.status(401).json({ error: "Access token missing" });

  jwt.verify(
    String(token),
    process.env.JWT_SECRET || "supersecret",
    (err: any, user: any) => {
      if (err)
        return res.status(403).json({ error: "Invalid or expired token" });
      req.user = user;
      next();
    },
  );
};

export const verifyAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (req.user?.role !== "ADMIN") {
    return res
      .status(403)
      .json({ error: "Unauthorized: Admin access required" });
  }
  next();
};
