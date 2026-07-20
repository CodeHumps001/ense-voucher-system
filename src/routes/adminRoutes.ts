import { Router } from "express";
import { createStaffMember, getAllStaff } from "../controllers/adminController";
import { verifyToken } from "../middleware/authMiddleware";

const router = Router();

router.use(verifyToken);

router.get("/users", getAllStaff);
router.post("/users", createStaffMember);

export default router;
