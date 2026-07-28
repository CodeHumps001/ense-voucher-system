import { Router } from "express";
import {
  getAllUsers,
  updateUserRole,
  deleteUser,
} from "../controllers/userController";
import { verifyAdmin, verifyToken } from "../middleware/authMiddleware";

const router = Router();

// Both middlewares chained together ensure only authenticated admins can access these endpoints
router.get("/users", verifyToken, verifyAdmin, getAllUsers);
router.patch("/users/:id/role", verifyToken, verifyAdmin, updateUserRole);
router.delete("/users/:id", verifyToken, verifyAdmin, deleteUser);

export default router;
