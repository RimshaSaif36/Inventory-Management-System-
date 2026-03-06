import dotenv from "dotenv";
import path from "path";
// Load environment variables first
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import fs from "fs";
const prisma = new PrismaClient();

async function deleteAllData(orderedFileNames: string[]) {
  const modelNames = orderedFileNames.map((fileName) => {
    const modelName = path.basename(fileName, path.extname(fileName));
    return modelName.charAt(0).toUpperCase() + modelName.slice(1);
  });

  for (const modelName of modelNames) {
    const model: any = prisma[modelName as keyof typeof prisma];
    if (model) {
      await model.deleteMany({});
      console.log(`Cleared data from ${modelName}`);
    } else {
      console.error(
        `Model ${modelName} not found. Please ensure the model name is correctly specified.`
      );
    }
  }
}

async function main() {
  // const dataDirectory = path.join(__dirname, "seedData");

  // const orderedFileNames = [
  //   "products.json",
  //   "expenseSummary.json",
  //   "sales.json",
  //   "salesSummary.json",
  //   "purchases.json",
  //   "purchaseSummary.json",
  //   "users.json",
  //   "expenses.json",
  //   "expenseByCategory.json",
  // ];

  // await deleteAllData(orderedFileNames);

  // For manual seeding, use Prisma queries instead:
  // Create initial brands if they don't exist
  const apexBrand = await prisma.brand.upsert({
    where: { id: "apex-brand" },
    update: {},
    create: {
      id: "apex-brand",
      name: "Apex",
      description: "Apex brand for inverters and electronics",
    },
  });

  // Create initial category if it doesn't exist
  const inverterCategory = await prisma.category.upsert({
    where: { id: "inverter-category" },
    update: {},
    create: {
      id: "inverter-category",
      name: "Inverters",
      description: "Inverter products",
      brandId: "apex-brand",
    },
  });

  // Create initial series if it doesn't exist
  const inverterSeries = await prisma.series.upsert({
    where: { id: "inverter-series" },
    update: {},
    create: {
      id: "inverter-series",
      name: "Home Inverters",
      description: "Home and residential inverters",
      categoryId: "inverter-category",
    },
  });

  console.log("Seeding completed!", { apexBrand, inverterCategory, inverterSeries });
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
