import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Detect database provider from DATABASE_PROVIDER env var first, then DATABASE_URL pattern
function getDatabaseProvider(): 'sqlite' | 'postgresql' {
  // Check explicit DATABASE_PROVIDER env var first (most reliable in production)
  const explicitProvider = process.env.DATABASE_PROVIDER
  if (explicitProvider === 'postgresql' || explicitProvider === 'postgres') {
    return 'postgresql'
  }
  if (explicitProvider === 'sqlite') {
    return 'sqlite'
  }
  // Fall back to DATABASE_URL pattern detection
  const url = process.env.DATABASE_URL || ''
  return url.startsWith('postgresql://') || url.startsWith('postgres://') ? 'postgresql' : 'sqlite'
}

// Handle missing DATABASE_URL gracefully
const databaseUrl = process.env.DATABASE_URL || 'file:./db/custom.db'

// Only set datasource override if needed
const prismaOptions: ConstructorParameters<typeof PrismaClient>[0] = {
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
}

// Override datasource URL only if it differs from schema default
if (databaseUrl !== 'file:./../db/usra.db') {
  prismaOptions.datasources = {
    db: {
      url: databaseUrl,
    },
  }
}

const prismaClient = new PrismaClient(prismaOptions)

export const db = globalForPrisma.prisma ?? prismaClient

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Graceful shutdown for serverless environments
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await db.$disconnect()
  })
}

export { getDatabaseProvider }
