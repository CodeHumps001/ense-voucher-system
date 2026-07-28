"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const voucherController_1 = require("../controllers/voucherController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.verifyToken);
router.get("/", voucherController_1.getVouchers);
router.get("/number/:voucherNumber", voucherController_1.getVoucherByNumber);
router.post("/", voucherController_1.createVoucher);
router.put("/:id", voucherController_1.updateVoucher);
// Admin-exclusive sign-off endpoints
router.patch("/:id/authorize", voucherController_1.authorizeVoucher);
router.patch("/:id/approve", voucherController_1.approveVoucher);
router.get("/:id/pdf", voucherController_1.generateVoucherPDF);
exports.default = router;
