import { Router } from "express";
import {
  register,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
} from "../controllers/authController";
import { verifyToken } from "../middleware/authMiddleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/change-password", verifyToken, changePassword);

export default router;
