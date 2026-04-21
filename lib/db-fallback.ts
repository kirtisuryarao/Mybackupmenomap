const PRISMA_CONNECTION_ERROR_CODES = new Set([
  'P1001',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'ENOTFOUND',
])

export function isPrismaConnectionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const prismaError = error as { code?: string; message?: string }

  if (prismaError.code && PRISMA_CONNECTION_ERROR_CODES.has(prismaError.code)) {
    return true
  }

  if (typeof prismaError.message !== 'string') {
    return false
  }

  return (
    prismaError.message.includes("Can't reach database server") ||
    prismaError.message.includes('timed out') ||
    prismaError.message.includes('connect timeout')
  )
}

export function canUseFileAuthFallback(): boolean {
  const flag = process.env.FILE_AUTH_FALLBACK

  if (flag === 'true') {
    return true
  }

  if (flag === 'false') {
    return false
  }

  return process.env.NODE_ENV !== 'production'
}
