import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes";
import adminRoutes from "./routes/adminRoutes"; // <-- Import admin routes
import voucherRoutes from "./routes/voucherRoutes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes); // <-- Mount admin routes here
app.use("/api/vouchers", voucherRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
