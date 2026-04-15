const PRISMA_CONNECTION_ERROR_CODE = 'P1001'

export function isPrismaConnectionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const prismaError = error as { code?: string; message?: string }

  if (prismaError.code === PRISMA_CONNECTION_ERROR_CODE) {
    return true
  }

  return typeof prismaError.message === 'string' && prismaError.message.includes("Can't reach database server")
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
