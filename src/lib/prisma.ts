import { PrismaClient } from "@prisma/client";

// Reuse a single client across hot reloads in dev and across invocations of a warm
// serverless function in prod (globalThis survives between requests on the same instance).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
