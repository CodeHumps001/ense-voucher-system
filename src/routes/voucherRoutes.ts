import { Router } from "express";
import {
  getVouchers,
  getVoucherByNumber,
  createVoucher,
  updateVoucher,
  authorizeVoucher,
  approveVoucher,
  generateVoucherPDF,
} from "../controllers/voucherController";
import { verifyToken } from "../middleware/authMiddleware";

const router = Router();

router.use(verifyToken);

router.get("/", getVouchers);
router.get("/number/:voucherNumber", getVoucherByNumber);
router.post("/", createVoucher);
router.put("/:id", updateVoucher);

// Admin-exclusive sign-off endpoints
router.patch("/:id/authorize", authorizeVoucher);
router.patch("/:id/approve", approveVoucher);

router.get("/:id/pdf", generateVoucherPDF);

export default router;
