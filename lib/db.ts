import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Serverless-compatible database connection
export function createPrismaClient() {
  try {
    if (globalForPrisma.prisma) {
      return globalForPrisma.prisma
    }
    
    const client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
    
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = client
    }
    
    return client
  } catch (error) {
    console.error('Failed to create Prisma client:', error)
    throw error
  }
}

// Legacy export with lazy initialization (safe for serverless)
// This ensures Prisma client is only created when actually used, not at import time
let _prismaInstance: PrismaClient | undefined

export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prismaInstance) {
      _prismaInstance = createPrismaClient()
    }
    return (_prismaInstance as any)[prop]
  }
})