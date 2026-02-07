-- CreateTable
CREATE TABLE "Users" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Products" (
    "productId" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "rating" REAL,
    "stockQuantity" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Sales" (
    "saleId" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" REAL NOT NULL,
    "totalAmount" REAL NOT NULL,
    CONSTRAINT "Sales_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Products" ("productId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Purchases" (
    "purchaseId" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" REAL NOT NULL,
    "totalCost" REAL NOT NULL,
    CONSTRAINT "Purchases_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Products" ("productId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Expenses" (
    "expenseId" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "timestamp" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SalesSummary" (
    "salesSummaryId" TEXT NOT NULL PRIMARY KEY,
    "totalValue" REAL NOT NULL,
    "changePercentage" REAL,
    "date" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PurchaseSummary" (
    "purchaseSummaryId" TEXT NOT NULL PRIMARY KEY,
    "totalPurchased" REAL NOT NULL,
    "changePercentage" REAL,
    "date" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ExpenseSummary" (
    "expenseSummaryId" TEXT NOT NULL PRIMARY KEY,
    "totalExpenses" REAL NOT NULL,
    "date" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ExpenseByCategory" (
    "expenseByCategoryId" TEXT NOT NULL PRIMARY KEY,
    "expenseSummaryId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "date" DATETIME NOT NULL,
    CONSTRAINT "ExpenseByCategory_expenseSummaryId_fkey" FOREIGN KEY ("expenseSummaryId") REFERENCES "ExpenseSummary" ("expenseSummaryId") ON DELETE RESTRICT ON UPDATE CASCADE
);
