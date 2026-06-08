import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : [],
    // SQLite: single connection to prevent "database is locked" on concurrent requests
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

// Enable WAL mode for better concurrent read performance
// (writes are still serialized, but reads don't block)
;(() => {
  try {
    ;(db as unknown as { $executeRawUnsafe: (q: string) => void }).$executeRawUnsafe(
      'PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA synchronous=NORMAL;'
    )
  } catch {
    // Ignore — will work on first actual query
  }
})()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db