import { Router } from "express";
import {
  getAllUsers,
  updateUserRole,
  deleteUser,
} from "../controllers/userController";
import { verifyAdmin, verifyToken } from "../middleware/authMiddleware";

const router = Router();

// Both middlewares chained together ensure only authenticated admins can access these endpoints
router.get("/", verifyToken, verifyAdmin, getAllUsers);
router.patch("/:id/role", verifyToken, verifyAdmin, updateUserRole);
router.delete("/:id", verifyToken, verifyAdmin, deleteUser);

export default router;
