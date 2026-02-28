import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import authRoutes from "./src/server/routes/authRoutes";
import productRoutes from "./src/server/routes/productRoutes";
import categoryRoutes from "./src/server/routes/categoryRoutes";
import customerRoutes from "./src/server/routes/customerRoutes";
import saleRoutes from "./src/server/routes/saleRoutes";
import dashboardRoutes from "./src/server/routes/dashboardRoutes";
import settingRoutes from "./src/server/routes/settingRoutes";
import workerRoutes from "./src/server/routes/workerRoutes";
import expenseRoutes from "./src/server/routes/expenseRoutes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Ensure uploads directory exists
  const uploadsDir = path.join(__dirname, "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
  }

  app.use(cors());
  app.use(express.json());
  app.use("/uploads", express.static(uploadsDir));

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/customers", customerRoutes);
  app.use("/api/sales", saleRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/settings", settingRoutes);
  app.use("/api/workers", workerRoutes);
  app.use("/api/expenses", expenseRoutes);

  // Handle 404 for API routes
  app.use("/api/*", (req, res) => {
    res.status(404).json({ message: `API route not found: ${req.originalUrl}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  // Global error handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
      message: err.message || "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? err : {},
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NexusPOS Pro running on http://localhost:${PORT}`);
  });
}

startServer();
