import { isPrismaConnectionError } from '@/lib/db-fallback'
import { prisma } from '@/lib/prisma'

export type ConsentScope = 'cycle' | 'symptoms'

export interface ConsentRecord {
  id: string
  userId: string
  partnerId: string
  scopes: string[]
  expiresAt: Date
  createdAt: Date
}

type ConsentAllowed = {
  allowed: true
  userId: string
  partnerId: string
  scopes: string[]
  expiresAt: Date
}

type ConsentDenied = {
  allowed: false
  status: number
  error: string
}

export type ConsentResult = ConsentAllowed | ConsentDenied

type ConsentServiceSuccess<T> = { success: true; data: T }
type ConsentServiceError = { success: false; status: number; error: string }
export type ConsentServiceResult<T> = ConsentServiceSuccess<T> | ConsentServiceError

const allowedScopes: ConsentScope[] = ['cycle', 'symptoms']

export async function listUserConsents(userId: string): Promise<ConsentServiceResult<ConsentRecord[]>> {
  try {
    const consents = await prisma.consent.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        partnerId: true,
        scopes: true,
        expiresAt: true,
        createdAt: true,
      },
    })

    return { success: true, data: consents }
  } catch (error) {
    if (isPrismaConnectionError(error)) {
      return { success: false, status: 503, error: 'Consent storage is temporarily unavailable' }
    }

    throw error
  }
}

export async function grantConsent(input: {
  userId: string
  partnerId: string
  scopes: ConsentScope[]
  expiresAt: Date
}): Promise<ConsentServiceResult<ConsentRecord>> {
  if (input.scopes.length === 0) {
    return { success: false, status: 400, error: 'At least one consent scope is required' }
  }

  if (input.scopes.some((scope) => !allowedScopes.includes(scope))) {
    return { success: false, status: 400, error: 'One or more consent scopes are invalid' }
  }

  if (input.expiresAt <= new Date()) {
    return { success: false, status: 400, error: 'Consent expiry must be in the future' }
  }

  try {
    const partner = await prisma.partner.findFirst({
      where: { id: input.partnerId, userId: input.userId },
      select: { id: true },
    })

    if (!partner) {
      return { success: false, status: 404, error: 'Partner not found' }
    }

    await prisma.consent.deleteMany({ where: { userId: input.userId, partnerId: input.partnerId } })

    const consent = await prisma.consent.create({
      data: {
        userId: input.userId,
        partnerId: input.partnerId,
        scopes: input.scopes,
        expiresAt: input.expiresAt,
      },
      select: {
        id: true,
        userId: true,
        partnerId: true,
        scopes: true,
        expiresAt: true,
        createdAt: true,
      },
    })

    return { success: true, data: consent }
  } catch (error) {
    if (isPrismaConnectionError(error)) {
      return { success: false, status: 503, error: 'Consent storage is temporarily unavailable' }
    }

    throw error
  }
}

export async function revokeConsent(userId: string, partnerId: string): Promise<ConsentServiceResult<{ partnerId: string }>> {
  try {
    await prisma.consent.deleteMany({ where: { userId, partnerId } })
    return { success: true, data: { partnerId } }
  } catch (error) {
    if (isPrismaConnectionError(error)) {
      return { success: false, status: 503, error: 'Consent storage is temporarily unavailable' }
    }

    throw error
  }
}

export async function assertPartnerConsent(
  partnerId: string,
  requiredScopes: ConsentScope[]
): Promise<ConsentResult> {
  try {
    const consent = await prisma.consent.findFirst({
      where: {
        partnerId,
        expiresAt: { gt: new Date() },
        scopes: { hasEvery: requiredScopes },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        userId: true,
        partnerId: true,
        scopes: true,
        expiresAt: true,
        partner: {
          select: {
            userId: true,
          },
        },
      },
    })

    if (!consent) {
      return { allowed: false, status: 403, error: 'Consent missing, expired, or insufficient for this data' }
    }

    if (consent.partner.userId !== consent.userId) {
      return { allowed: false, status: 403, error: 'Consent does not match the linked partner account' }
    }

    return {
      allowed: true,
      userId: consent.userId,
      partnerId: consent.partnerId,
      scopes: consent.scopes,
      expiresAt: consent.expiresAt,
    }
  } catch (error) {
    if (isPrismaConnectionError(error)) {
      return { allowed: false, status: 503, error: 'Consent verification is temporarily unavailable' }
    }

    throw error
  }
}
