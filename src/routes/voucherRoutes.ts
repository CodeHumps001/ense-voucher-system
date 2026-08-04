import { Router } from "express";
import {
  getVouchers,
  getVoucherByNumber,
  createVoucher,
  updateVoucher,
  deleteVoucher,
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
router.delete("/:id", deleteVoucher);

// Admin-exclusive sign-off endpoints
router.patch("/:id/authorize", authorizeVoucher);
router.patch("/:id/approve", approveVoucher);

router.get("/:id/pdf", generateVoucherPDF);

export default router;
