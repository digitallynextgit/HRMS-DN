import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

// Survive Turbopack/HMR by caching the pool AND the Prisma client on globalThis.
// Without this, every module reload spins up a new pg.Pool and leaks connections
// until Supabase Supavisor (session mode, 15-connection cap) refuses new clients.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
  pgPool?: Pool
}

const MAX_CONNECTIONS = process.env.NODE_ENV === "production" ? 10 : 5

function getPool(): Pool {
  if (globalForPrisma.pgPool) return globalForPrisma.pgPool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: MAX_CONNECTIONS,
    idleTimeoutMillis: 30_000,
  })
  if (process.env.NODE_ENV !== "production") globalForPrisma.pgPool = pool
  return pool
}

function createClient(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg(getPool()),
    log: ["error", "warn"],
  })
}

export const db = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
