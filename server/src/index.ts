/* CONFIGURATIONS - Load environment variables first */
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { prisma } from "./lib/prisma";

import compression from "compression";

/* ROUTE IMPORTS */
import dashboardRoutes from "./routes/dashboardRoutes";
import productRoutes from "./routes/productRoutes";
import userRoutes from "./routes/userRoutes";
import expenseRoutes from "./routes/expenseRoutes";
import brandRoutes from "./routes/brandRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import seriesRoutes from "./routes/seriesRoutes";
import supplierRoutes from "./routes/supplierRoutes";
import purchaseRoutes from "./routes/purchaseRoutes";
import customerRoutes from "./routes/customerRoutes";
import employeeRoutes from "./routes/employeeRoutes";
import saleRoutes from "./routes/saleRoutes";
import salesOrderRoutes from "./routes/salesOrderRoutes";
import invoiceRoutes from "./routes/invoiceRoutes";
import stockRoutes from "./routes/stockRoutes";
import reportRoutes from "./routes/reportRoutes";
import authRoutes from "./routes/authRoutes";
import quotationRoutes from "./routes/quotationRoutes";
import notificationRoutes from "./routes/notificationRoutes";

const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

// Enable gzip compression for all responses
app.use(compression());

// Serve local uploads when Cloudinary is disabled/unavailable
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

// Set cache headers for static and API responses
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "public, max-age=60");
  next();
});

app.get("/health/db", async (req, res) => {            //http://localhost:8000/health/db
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "Database connected" });
  } catch (err) {
    res.status(500).json({ error: "DB connection failed" });
  }
});


/* ROUTES */
app.use("/auth", authRoutes); // http://localhost:5000/auth
app.use("/dashboard", dashboardRoutes); // http://localhost:5000/dashboard
app.use("/products", productRoutes); // http://localhost:5000/products
app.use("/users", userRoutes); // http://localhost:5000/users
app.use("/expenses", expenseRoutes); // http://localhost:5000/expenses
app.use("/brands", brandRoutes); // http://localhost:5000/brands
app.use("/categories", categoryRoutes); // http://localhost:5000/categories
app.use("/series", seriesRoutes); // http://localhost:5000/series
app.use("/suppliers", supplierRoutes); // http://localhost:5000/suppliers
app.use("/purchases", purchaseRoutes); // http://localhost:5000/purchases
app.use("/customers", customerRoutes); // http://localhost:5000/customers
app.use("/employees", employeeRoutes); // http://localhost:5000/employees
app.use("/sales", saleRoutes); // http://localhost:5000/sales
app.use("/sales-orders", salesOrderRoutes); // http://localhost:5000/sales-orders
app.use("/invoices", invoiceRoutes); // http://localhost:5000/invoices
app.use("/stock", stockRoutes); // http://localhost:5000/stock
app.use("/reports", reportRoutes); // http://localhost:5000/reports
app.use("/quotations", quotationRoutes); // http://localhost:5000/quotations
app.use("/notifications", notificationRoutes); // http://localhost:5000/notifications

/* ERROR HANDLING MIDDLEWARE */
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Error:", err);

  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: "File size exceeds 10MB limit" });
  }
  if (err.code === 'LIMIT_PART_COUNT') {
    return res.status(400).json({ error: "Too many parts in form" });
  }
  if (err.message && err.message.includes('Only image files are allowed')) {
    return res.status(400).json({ error: "Only image files are allowed" });
  }

  res.status(err.status || 500).json({
    error: err?.message || "Internal server error",
    details: process.env.NODE_ENV === 'development' ? err : undefined
  });
});

/* SERVER */
const port = Number(process.env.PORT) || 3000;
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});

// Graceful shutdown handler (only for SIGTERM in dev; SIGINT is handled by nodemon)
process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Gracefully shutting down...");
  server.close(async () => {
    await prisma.$disconnect();
    console.log("Disconnected from database. Goodbye!");
    process.exit(0);
  });
});

// Handle any uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});
