import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { AppSetupError } from '@/lib/setup-error'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Prisma Client configured for Supabase
 * 
 * Uses connection pooling (DATABASE_URL) for queries
 * Uses direct connection (DIRECT_URL) for migrations
 * 
 * Supabase connection pooling:
 * - Transaction mode: Use for most queries (default)
 * - Session mode: Use for migrations and admin operations
 */
function getValidatedDatabaseUrl() {
  const connectionString = process.env.DATABASE_URL?.trim()

  if (!connectionString) {
    throw new AppSetupError(
      'DATABASE_URL is not set. Add a valid PostgreSQL connection string to .env.local.'
    )
  }

  if (connectionString.includes('USER:PASSWORD@HOST:PORT/DBNAME')) {
    throw new AppSetupError(
      'DATABASE_URL still contains placeholder values. Replace USER, PASSWORD, HOST, PORT, and DBNAME in .env.local with your real PostgreSQL or Supabase credentials.'
    )
  }

  let parsedUrl: URL

  try {
    parsedUrl = new URL(connectionString)
  } catch {
    throw new AppSetupError(
      'DATABASE_URL is not a valid URL. Expected format: postgresql://username:password@host:5432/database?sslmode=require'
    )
  }

  if (!['postgres:', 'postgresql:'].includes(parsedUrl.protocol)) {
    throw new AppSetupError(
      'DATABASE_URL must start with postgres:// or postgresql://'
    )
  }

  if (!parsedUrl.hostname || parsedUrl.pathname === '/' || !parsedUrl.pathname) {
    throw new AppSetupError(
      'DATABASE_URL must include both a database host and database name.'
    )
  }

  return connectionString
}

function createPrismaClient() {
  const connectionString = getValidatedDatabaseUrl()

  // Create a PostgreSQL connection pool
  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }

  return globalForPrisma.prisma
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient() as PrismaClient & Record<PropertyKey, unknown>
    const value = client[property]

    return typeof value === 'function' ? value.bind(client) : value
  },
})
