import { PrismaClient } from '@prisma/client'

type PrismaModels = keyof PrismaClient

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * DB client — lazy initialization.
 * On Vercel (no DATABASE_URL), returns a safe noop proxy.
 * On sandbox, connects to SQLite normally.
 */
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : [],
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'file:/home/z/my-project/db/custom.db',
      },
    },
  })
}

function getRealClient(): PrismaClient | undefined {
  if (!process.env.DATABASE_URL) return undefined
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }
  return globalForPrisma.prisma
}

/**
 * Creates a noop proxy that returns resolved promises with empty/null results.
 * Prevents build-time crashes when no DB is available.
 */
function createNoopProxy(): PrismaClient {
  const noopModel = new Proxy({}, {
    get() {
      // Every method on a model returns a resolved promise with empty result
      return () => Promise.resolve(null)
    }
  })
  return new Proxy({} as PrismaClient, {
    get(_target, prop) {
      if (prop === '$connect' || prop === '$disconnect') return () => Promise.resolve()
      if (prop === '$on' || prop === '$transaction' || prop === '$executeRaw' || prop === '$executeRawUnsafe' || prop === '$queryRaw' || prop === '$queryRawUnsafe') {
        return () => Promise.resolve([])
      }
      // All model names return the noop model proxy
      return noopModel
    }
  })
}

export const db: PrismaClient = (function(): PrismaClient {
  // In production build on Vercel, use noop to avoid crashes
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
    return createNoopProxy()
  }
  // Sandbox/dev — try real connection
  const client = createPrismaClient()
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client
  }
  return client
})()

export function getDb(): PrismaClient | undefined {
  return getRealClient()
}

export function hasDb(): boolean {
  return !!process.env.DATABASE_URL
}
