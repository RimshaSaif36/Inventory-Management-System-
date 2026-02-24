import express from "express";
import dotenv from "dotenv";
import path from "path";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { prisma } from "./lib/prisma";

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

/* CONFIGURATIONS */
dotenv.config({ path: path.resolve(__dirname, "../.env") });
const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

app.get("/health/db", async (req, res) => {            //http://localhost:8000/health/db
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "Database connected" });
  } catch (err) {
    res.status(500).json({ error: "DB connection failed" });
  }
});


/* ROUTES */
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

/* ERROR HANDLING MIDDLEWARE */
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({ error: err?.message || "Internal server error" });
});

/* SERVER */
const port = Number(process.env.PORT) || 5000;
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
