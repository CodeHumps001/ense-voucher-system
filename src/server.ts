import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes";
import adminRoutes from "./routes/adminRoutes";
import voucherRoutes from "./routes/voucherRoutes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Health check endpoint (for monitoring and uptime)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Root welcome route
app.get("/", (req, res) => {
  res.send("VoucherFlow Backend API is running.");
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/vouchers", voucherRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
