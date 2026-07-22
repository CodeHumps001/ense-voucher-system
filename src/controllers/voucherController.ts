import { Response } from "express";

import { AuthRequest } from "../middleware/authMiddleware";
import PDFDocument from "pdfkit";
import path from "path";
import { prisma } from "../lib/prisma";

export const getVouchers = async (req: AuthRequest, res: Response) => {
  try {
    const { search } = req.query;
    const user = req.user;
    const where: any = {};

    if (user?.role === "STAFF") {
      where.userId = user.id;
    }

    if (search) {
      where.OR = [
        { voucherNumber: { contains: String(search), mode: "insensitive" } },
        { requestedBy: { contains: String(search), mode: "insensitive" } },
      ];
    }

    const vouchers = await prisma.voucher.findMany({
      where,
      include: {
        items: true,
        user: { select: { name: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(vouchers);
  } catch (error) {
    console.error("Get vouchers error:", error);
    res.status(500).json({ error: "Failed to fetch vouchers" });
  }
};

export const getVoucherByNumber = async (req: AuthRequest, res: Response) => {
  try {
    const { voucherNumber } = req.params;
    const user = req.user;

    const voucher = await prisma.voucher.findUnique({
      where: { voucherNumber },
      include: { items: true, user: { select: { name: true, email: true } } },
    });

    if (!voucher) return res.status(404).json({ error: "Voucher not found" });

    if (user?.role === "STAFF" && voucher.userId !== user.id) {
      return res
        .status(403)
        .json({ error: "Unauthorized access to this voucher" });
    }

    res.json(voucher);
  } catch (error) {
    console.error("Get voucher by number error:", error);
    res.status(500).json({ error: "Failed to fetch voucher by number" });
  }
};

export const updateVoucher = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const {
      voucherNumber,
      paymentMethod,
      whtPercentage,
      cashAdvanced,
      items,
      requestedBy,
    } = req.body;

    const existingVoucher = await prisma.voucher.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existingVoucher) {
      return res.status(404).json({ error: "Voucher not found" });
    }

    if (user?.role === "STAFF" && existingVoucher.userId !== user.id) {
      return res
        .status(403)
        .json({ error: "Unauthorized to update this voucher" });
    }

    let totalAmountGhc = existingVoucher.totalAmountGhc;
    let totalAmountUsd = existingVoucher.totalAmountUsd;

    if (items && Array.isArray(items)) {
      totalAmountGhc = items.reduce(
        (sum: number, i: any) => sum + Number(i.ghcAmount || 0),
        0,
      );
      totalAmountUsd = items.reduce(
        (sum: number, i: any) => sum + Number(i.usdAmount || 0),
        0,
      );
    }

    const invoiceAmount = totalAmountGhc;
    let cashRetiredAmount = existingVoucher.cashRetiredAmount;
    let cashReimbursedAmt = existingVoucher.cashReimbursedAmt;

    if (
      cashAdvanced !== undefined &&
      cashAdvanced !== null &&
      cashAdvanced !== ""
    ) {
      const numericAdvance = Number(cashAdvanced);
      const variance = numericAdvance - invoiceAmount;
      cashRetiredAmount = variance > 0 ? variance : 0;
      cashReimbursedAmt = variance < 0 ? Math.abs(variance) : 0;
    }

    const updatedVoucher = await prisma.voucher.update({
      where: { id },
      data: {
        voucherNumber: voucherNumber || existingVoucher.voucherNumber,
        requestedBy:
          requestedBy !== undefined ? requestedBy : existingVoucher.requestedBy,
        paymentMethod: paymentMethod || existingVoucher.paymentMethod,
        whtPercentage:
          whtPercentage !== undefined
            ? Number(whtPercentage)
            : existingVoucher.whtPercentage,
        totalAmountGhc,
        totalAmountUsd,
        invoiceAmount,
        cashRetiredAmount,
        cashReimbursedAmt,
        items: items
          ? {
              deleteMany: {},
              create: items.map((i: any) => ({
                expenseDate: i.expenseDate
                  ? new Date(i.expenseDate)
                  : new Date(),
                description: i.description || "No description",
                ghcAmount: Number(i.ghcAmount || 0),
                usdAmount: Number(i.usdAmount || 0),
              })),
            }
          : undefined,
      },
      include: { items: true },
    });

    return res.json({ success: true, voucher: updatedVoucher });
  } catch (err: any) {
    console.error("Error updating voucher:", err);
    return res
      .status(500)
      .json({ error: err.message || "Failed to update voucher" });
  }
};

export const retireVoucher = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { cashAdvanced, retirementNameSign } = req.body;
    const userId = req.user?.id;

    let staffName = retirementNameSign;
    if (!staffName && userId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      staffName = dbUser?.name || "Verified Staff";
    }

    const voucher = await prisma.voucher.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!voucher) return res.status(404).json({ error: "Voucher not found" });

    const invoiceAmount = voucher.totalAmountGhc;
    const numericAdvance = Number(cashAdvanced || 0);
    const variance = numericAdvance - invoiceAmount;

    const cashRetiredAmount = variance > 0 ? variance : 0;
    const cashReimbursedAmt = variance < 0 ? Math.abs(variance) : 0;

    const updatedVoucher = await prisma.voucher.update({
      where: { id },
      data: {
        retirementDate: new Date(),
        invoiceAmount,
        cashRetiredAmount,
        cashReimbursedAmt,
        retirementNameSign: staffName,
      },
      include: { items: true },
    });

    res.json({
      message: "Voucher successfully retired and reconciled by server",
      voucher: updatedVoucher,
      varianceAnalysis: {
        cashAdvanced: numericAdvance,
        invoiceAmount,
        status:
          variance > 0
            ? "REFUND_DUE_TO_COMPANY"
            : variance < 0
              ? "REIMBURSEMENT_DUE_TO_STAFF"
              : "BALANCED",
        amount: Math.abs(variance),
      },
    });
  } catch (error) {
    console.error("Retire voucher error:", error);
    res.status(500).json({ error: "Failed to retire voucher" });
  }
};

// Authorize Voucher (Admin Level)
export const authorizeVoucher = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (user?.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "Unauthorized: Requires admin privileges" });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true },
    });

    const voucher = await prisma.voucher.findUnique({ where: { id } });
    if (!voucher) return res.status(404).json({ error: "Voucher not found" });

    const updated = await prisma.voucher.update({
      where: { id },
      data: {
        authorizedBy: dbUser?.name || "System Admin",
        authorizedDate: new Date(),
      },
      include: { items: true },
    });

    return res.json({ success: true, voucher: updated });
  } catch (error: any) {
    console.error("Authorize voucher error:", error);
    return res.status(500).json({ error: "Failed to authorize voucher" });
  }
};

// Approve Voucher (Admin Level)
export const approveVoucher = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (user?.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "Unauthorized: Requires admin privileges" });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true },
    });

    const voucher = await prisma.voucher.findUnique({ where: { id } });
    if (!voucher) return res.status(404).json({ error: "Voucher not found" });

    const updated = await prisma.voucher.update({
      where: { id },
      data: {
        approvedBy: dbUser?.name || "System Admin",
        approvedDate: new Date(),
      },
      include: { items: true },
    });

    return res.json({ success: true, voucher: updated });
  } catch (error: any) {
    console.error("Approve voucher error:", error);
    return res.status(500).json({ error: "Failed to approve voucher" });
  }
};

export const createVoucher = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: User not found" });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const {
      items,
      paymentMethod,
      whtPercentage,
      authorizedBy,
      authorizedDate,
      approvedBy,
      approvedDate,
      retirementDate,
      cashAdvanced,
      retirementNameSign,
      requestedBy,
      requestDate,
      paidBy,
    } = req.body;

    const parsedItems = Array.isArray(items) ? items : [];

    const totalAmountGhc = parsedItems.reduce(
      (sum: number, i: any) => sum + Number(i.ghcAmount || 0),
      0,
    );
    const totalAmountUsd = parsedItems.reduce(
      (sum: number, i: any) => sum + Number(i.usdAmount || 0),
      0,
    );

    const invoiceAmount = totalAmountGhc;
    let cashRetiredAmount = 0;
    let cashReimbursedAmt = 0;

    if (
      cashAdvanced !== undefined &&
      cashAdvanced !== null &&
      cashAdvanced !== ""
    ) {
      const numericAdvance = Number(cashAdvanced);
      const variance = numericAdvance - invoiceAmount;

      cashRetiredAmount = variance > 0 ? variance : 0;
      cashReimbursedAmt = variance < 0 ? Math.abs(variance) : 0;
    }

    // Generate Voucher Number: PV-{YYYY}{MM}-{sequence} e.g. PV-202607-0001
    // Wrapped in a transaction so concurrent requests can't get the same number
    const voucher = await prisma.$transaction(async (tx: any) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const yearMonthPrefix = `PV-${year}${month}`;

      const startOfMonth = new Date(year, now.getMonth(), 1);
      const startOfNextMonth = new Date(year, now.getMonth() + 1, 1);

      const countThisMonth = await tx.voucher.count({
        where: {
          createdAt: {
            gte: startOfMonth,
            lt: startOfNextMonth,
          },
        },
      });

      const sequence = String(countThisMonth + 1).padStart(4, "0");
      const voucherNumber = `${yearMonthPrefix}${sequence}`;

      return tx.voucher.create({
        data: {
          voucherNumber,
          totalAmountGhc,
          totalAmountUsd,
          userId,
          requestedBy: requestedBy || dbUser?.name || "Staff Member",
          requestDate: requestDate ? new Date(requestDate) : new Date(),
          paidBy: paidBy || null,
          paymentMethod: paymentMethod || undefined,
          whtPercentage:
            whtPercentage !== undefined ? Number(whtPercentage) : undefined,

          authorizedBy: null,
          authorizedDate: null,
          approvedBy: null,
          approvedDate: null,

          retirementDate: retirementDate
            ? new Date(retirementDate)
            : cashAdvanced
              ? new Date()
              : null,
          invoiceAmount,
          cashRetiredAmount,
          cashReimbursedAmt,
          retirementNameSign: retirementNameSign || null,
          items: {
            create: parsedItems.map((i: any) => ({
              expenseDate: i.expenseDate ? new Date(i.expenseDate) : new Date(),
              description: i.description || "No description",
              ghcAmount: Number(i.ghcAmount || 0),
              usdAmount: Number(i.usdAmount || 0),
            })),
          },
        },
        include: { items: true },
      });
    });

    res.status(201).json(voucher);
  } catch (error) {
    console.error("Create voucher error:", error);
    res.status(500).json({ error: "Failed to create voucher" });
  }
};

// ==========================================
// 2. GENERATE VOUCHER PDF CONTROLLER
// ==========================================
export const generateVoucherPDF = async (req: AuthRequest, res: Response) => {
  try {
    const voucher = await prisma.voucher.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });

    if (!voucher) return res.status(404).json({ error: "Voucher not found" });

    if (req.user?.role === "STAFF" && voucher.userId !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Unauthorized to download this PDF" });
    }

    const doc = new PDFDocument({ size: "A4", margin: 30 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=Voucher-${voucher.voucherNumber}.pdf`,
    );
    doc.pipe(res);

    // Outer Frame & Header
    doc.rect(30, 30, 535, 770).stroke();

    try {
      const logoPath = path.join(process.cwd(), "public", "logo.jpg");
      doc.image(logoPath, 515, 36, { width: 32, height: 32 });
    } catch (err) {
      console.error("Logo image could not be loaded for PDF:", err);
    }

    doc
      .fontSize(13)
      .font("Helvetica-Bold")
      .text("EXPENSE PAYMENT VOUCHER", 80, 40, { width: 400, align: "center" });
    doc.fontSize(9).font("Helvetica-Bold");
    doc.text(`PV#: ${voucher.voucherNumber}`, 85, 66);
    doc.text(
      `Date: ${new Date(voucher.createdAt).toLocaleDateString()}`,
      400,
      66,
    );
    doc.moveTo(30, 82).lineTo(565, 82).stroke();

    // Itemized Table Header
    const tableTop = 82;
    doc.rect(30, tableTop, 70, 26).stroke();
    doc.rect(100, tableTop, 305, 26).stroke();
    doc.rect(405, tableTop, 160, 13).stroke();

    doc.font("Helvetica-Bold").fontSize(9);
    doc.text("Date", 30, tableTop + 9, { width: 70, align: "center" });
    doc.text("Description", 105, tableTop + 9, { width: 400, align: "left" });
    doc.text("Amount", 405, tableTop + 3, { width: 80, align: "center" });

    doc.rect(405, tableTop + 13, 80, 13).stroke();
    doc.rect(485, tableTop + 13, 80, 13).stroke();
    doc.text("GHC", 405, tableTop + 16, { width: 40, align: "center" });
    doc.text("USD", 485, tableTop + 16, { width: 40, align: "center" });

    let currentY = tableTop + 26;
    const rowHeight = 17;
    const maxRows = 20;

    for (let i = 0; i < maxRows; i++) {
      const item = voucher.items[i];
      doc.rect(30, currentY, 70, rowHeight).stroke();
      doc.rect(100, currentY, 305, rowHeight).stroke();
      doc.rect(405, currentY, 80, rowHeight).stroke();
      doc.rect(485, currentY, 80, rowHeight).stroke();

      if (item) {
        doc.font("Helvetica").fontSize(7.5);
        doc.text(
          new Date(item.expenseDate).toLocaleDateString(),
          32,
          currentY + 4,
          { width: 66, align: "center" },
        );
        doc.text(item.description, 105, currentY + 4, {
          width: 295,
          ellipsis: true,
        });
        doc.text(item.ghcAmount.toFixed(2), 405, currentY + 4, {
          width: 75,
          align: "right",
        });
        doc.text(item.usdAmount.toFixed(2), 485, currentY + 4, {
          width: 75,
          align: "right",
        });
      }
      currentY += rowHeight;
    }

    // Total Row
    doc.rect(30, currentY, 375, 18).stroke();
    doc.rect(405, currentY, 80, 18).stroke();
    doc.rect(485, currentY, 80, 18).stroke();

    doc.font("Helvetica-Bold").fontSize(9);
    doc.text("Total", 340, currentY + 5, { width: 60, align: "right" });
    doc.text(`GHS ${voucher.totalAmountGhc.toFixed(2)}`, 405, currentY + 5, {
      width: 75,
      align: "right",
    });
    doc.text(`$ ${voucher.totalAmountUsd.toFixed(2)}`, 485, currentY + 5, {
      width: 75,
      align: "right",
    });
    currentY += 18;

    // Signatures Block 1
    const sigBlockHeight = 70;
    doc.rect(30, currentY, 535, sigBlockHeight).stroke();
    doc
      .moveTo(208, currentY)
      .lineTo(208, currentY + sigBlockHeight)
      .stroke();
    doc
      .moveTo(386, currentY)
      .lineTo(386, currentY + sigBlockHeight)
      .stroke();

    doc.font("Helvetica-Bold").fontSize(8.5);
    doc.text("Request by:", 35, currentY + 5);
    doc.text("Authorised:", 213, currentY + 5);
    doc.text("Approved:", 391, currentY + 5);

    doc.font("Helvetica").fontSize(8);
    doc.text(`Name: ${voucher.requestedBy}`, 35, currentY + 17);
    doc.text(
      `Date: ${new Date(voucher.requestDate).toLocaleDateString()}`,
      35,
      currentY + 29,
    );
    doc.text("Signature:", 35, currentY + 42);
    doc
      .moveTo(75, currentY + 50)
      .lineTo(195, currentY + 50)
      .stroke();

    doc.text(`Name: ${voucher.authorizedBy || ""}`, 213, currentY + 17);
    doc.text(
      `Date: ${voucher.authorizedDate ? new Date(voucher.authorizedDate).toLocaleDateString() : ""}`,
      213,
      currentY + 29,
    );
    doc.text("Signature:", 213, currentY + 42);
    doc
      .moveTo(253, currentY + 50)
      .lineTo(373, currentY + 50)
      .stroke();

    doc.text(`Name: ${voucher.approvedBy || ""}`, 391, currentY + 17);
    doc.text(
      `Date: ${voucher.approvedDate ? new Date(voucher.approvedDate).toLocaleDateString() : ""}`,
      391,
      currentY + 29,
    );
    doc.text("Signature:", 391, currentY + 42);
    doc
      .moveTo(431, currentY + 50)
      .lineTo(551, currentY + 50)
      .stroke();

    currentY += sigBlockHeight;

    // Finance Manager Authorisation — now with real signing room
    const fmBlockHeight = 50;
    doc.rect(30, currentY, 535, fmBlockHeight).stroke();
    doc.font("Helvetica-Bold").fontSize(8.5);
    doc.text("Finance Manager's Payment Authorisation:", 35, currentY + 5);

    doc.font("Helvetica").fontSize(8);
    doc.text("Sign:", 35, currentY + 20);
    doc
      .moveTo(60, currentY + 38)
      .lineTo(280, currentY + 38)
      .stroke();
    doc.text("Date:", 300, currentY + 20);
    doc
      .moveTo(325, currentY + 38)
      .lineTo(555, currentY + 38)
      .stroke();

    currentY += fmBlockHeight;

    // Payment Method & WHT Section
    const payBlockHeight = 70;
    doc.rect(30, currentY, 535, payBlockHeight).stroke();
    doc
      .moveTo(208, currentY)
      .lineTo(208, currentY + payBlockHeight)
      .stroke();
    doc
      .moveTo(386, currentY)
      .lineTo(386, currentY + payBlockHeight)
      .stroke();

    doc.font("Helvetica-Bold").fontSize(8.5);
    doc.text("Paid by:", 35, currentY + 5);
    doc.font("Helvetica").fontSize(8);

    doc.text(
      `Name: ${voucher.paidBy || "................................"}`,
      35,
      currentY + 17,
    );
    const paymentTimestamp = voucher.approvedDate || voucher.createdAt;
    const formattedPaymentDate = paymentTimestamp
      ? new Date(paymentTimestamp).toLocaleDateString()
      : "..............................";
    doc.text(`Date: ${formattedPaymentDate}`, 35, currentY + 29);
    doc.text("Signature:", 35, currentY + 42);
    doc
      .moveTo(75, currentY + 50)
      .lineTo(195, currentY + 50)
      .stroke();

    const pm = voucher.paymentMethod;
    doc.font("Helvetica").fontSize(8);
    doc.text(
      `Petty Cash [ ${pm === "PETTY_CASH" ? "X" : " "} ]`,
      213,
      currentY + 8,
    );
    doc.text(
      `Cheque    [ ${pm === "CHEQUE" ? "X" : " "} ]`,
      213,
      currentY + 22,
    );
    doc.text(`Kowri     [ ${pm === "KOWRI" ? "X" : " "} ]`, 213, currentY + 36);

    doc.font("Helvetica-Bold").fontSize(8.5);
    doc.text("WHT:", 391, currentY + 5);
    doc.font("Helvetica").fontSize(8);
    const wht = voucher.whtPercentage;
    doc.text(`3% [ ${wht === 3 ? "X" : " "} ]`, 391, currentY + 16);
    doc.text(`5% [ ${wht === 5 ? "X" : " "} ]`, 391, currentY + 28);
    doc.text(`7.5% [ ${wht === 7.5 ? "X" : " "} ]`, 391, currentY + 40);

    currentY += payBlockHeight;

    // Received by & Retirement
    const bottomHeight = 130;
    doc.rect(30, currentY, 535, bottomHeight).stroke();
    doc
      .moveTo(320, currentY)
      .lineTo(320, currentY + bottomHeight)
      .stroke();

    doc.font("Helvetica-Bold").fontSize(8.5);
    doc.text("Received by:", 35, currentY + 7);
    doc.font("Helvetica").fontSize(8);
    doc
      .moveTo(35, currentY + 32)
      .lineTo(290, currentY + 32)
      .stroke();

    doc.text("Signature &", 35, currentY + 60);
    doc.text("Date", 35, currentY + 70);
    doc
      .moveTo(95, currentY + 90)
      .lineTo(290, currentY + 90)
      .stroke();

    doc.rect(325, currentY + 5, 235, 13).fillAndStroke("#e2e8f0", "#000000");
    doc.fillColor("#000000").font("Helvetica-Bold").fontSize(8.5);
    doc.text("RETIREMENT", 325, currentY + 7, { width: 235, align: "center" });

    doc.font("Helvetica").fontSize(8);
    doc.text(
      `Date: ${voucher.retirementDate ? new Date(voucher.retirementDate).toLocaleDateString() : "..................................................."}`,
      330,
      currentY + 24,
    );
    doc.text(
      `Invoice Amount: GHS ${voucher.invoiceAmount?.toFixed(2) || "......................................."}`,
      330,
      currentY + 40,
    );

    const isRetired = (voucher.cashRetiredAmount || 0) > 0;
    const isReimbursed = (voucher.cashReimbursedAmt || 0) > 0;

    doc.text(
      `Cash [ ${isRetired ? "X" : " "} ] retired: GHS ${voucher.cashRetiredAmount ? voucher.cashRetiredAmount.toFixed(2) : "................................"}`,
      330,
      currentY + 56,
    );
    doc.text(
      `[ ${isReimbursed ? "X" : " "} ] reimbursed: GHS ${voucher.cashReimbursedAmt ? voucher.cashReimbursedAmt.toFixed(2) : "................................"}`,
      330,
      currentY + 72,
    );
    doc.text(
      `Name & Signature: ${voucher.retirementNameSign || "..............................................."}`,
      330,
      currentY + 88,
    );

    doc.end();
  } catch (error) {
    console.error("PDF generation error:", error);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
};
