import * as PrismaPkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
  // survive hot reloads in dev
  // eslint-disable-next-line no-var
  var prisma: any | undefined;
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn(
    "[Prisma] DATABASE_URL is not set. Please configure your database connection."
  );
}

// Ensure a single pg Pool instance
const pool: Pool =
  globalThis.pgPool ??
  new Pool({
    connectionString: connectionString ?? "",
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.pgPool = pool;
}

// Adapter for Prisma 7
const adapter = new PrismaPg(pool);

// Resolve PrismaClient constructor at runtime to avoid named-export mismatches
const PrismaClientCtor =
  // prefer explicit export if present
  (PrismaPkg as any).PrismaClient ??
  // fallback to default export
  (PrismaPkg as any).default ??
  // last-resort: the module itself may be the constructor
  (PrismaPkg as any);

// Ensure a single PrismaClient instance
export const prisma: any =
  globalThis.prisma ||
  new PrismaClientCtor({
    adapter,
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}