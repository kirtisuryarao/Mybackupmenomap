import { isPrismaConnectionError } from '@/lib/db-fallback'
import { prisma } from '@/lib/prisma'

export type ConsentScope = 'cycle' | 'symptoms' | 'mood' | 'notes'

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

const allowedScopes: ConsentScope[] = ['cycle', 'symptoms', 'mood', 'notes']

function getConsentDelegate() {
  return (prisma as unknown as Record<string, any>).consent ?? null
}

function isConsentStorageUnavailable(error: unknown): boolean {
  if (isPrismaConnectionError(error)) {
    return true
  }

  if (!error || typeof error !== 'object') {
    return false
  }

  const prismaError = error as { code?: string; message?: string }
  return prismaError.code === 'P2021' || typeof prismaError.message === 'string' && /consent|consents|does not exist/i.test(prismaError.message)
}

async function allowLinkedPartnerFallback(
  partnerId: string,
  requiredScopes: ConsentScope[],
): Promise<ConsentResult> {
  if (requiredScopes.some((scope) => scope !== 'cycle')) {
    return { allowed: false, status: 503, error: 'Consent storage is temporarily unavailable' }
  }

  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    select: { id: true, userId: true },
  })

  if (!partner) {
    return { allowed: false, status: 404, error: 'Partner not found' }
  }

  return {
    allowed: true,
    userId: partner.userId,
    partnerId: partner.id,
    scopes: ['cycle'],
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  }
}

export async function listUserConsents(userId: string): Promise<ConsentServiceResult<ConsentRecord[]>> {
  const consentDelegate = getConsentDelegate()
  if (!consentDelegate) {
    return { success: true, data: [] }
  }

  try {
    const consents = await consentDelegate.findMany({
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
    if (isConsentStorageUnavailable(error)) {
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
  const consentDelegate = getConsentDelegate()
  if (!consentDelegate) {
    return { success: false, status: 503, error: 'Consent storage is temporarily unavailable' }
  }

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

    await consentDelegate.deleteMany({ where: { userId: input.userId, partnerId: input.partnerId } })

    const consent = await consentDelegate.create({
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
    if (isConsentStorageUnavailable(error)) {
      return { success: false, status: 503, error: 'Consent storage is temporarily unavailable' }
    }

    throw error
  }
}

export async function revokeConsent(userId: string, partnerId: string): Promise<ConsentServiceResult<{ partnerId: string }>> {
  const consentDelegate = getConsentDelegate()
  if (!consentDelegate) {
    return { success: false, status: 503, error: 'Consent storage is temporarily unavailable' }
  }

  try {
    await consentDelegate.deleteMany({ where: { userId, partnerId } })
    return { success: true, data: { partnerId } }
  } catch (error) {
    if (isConsentStorageUnavailable(error)) {
      return { success: false, status: 503, error: 'Consent storage is temporarily unavailable' }
    }

    throw error
  }
}

export async function assertPartnerConsent(
  partnerId: string,
  requiredScopes: ConsentScope[]
): Promise<ConsentResult> {
  const consentDelegate = getConsentDelegate()
  if (!consentDelegate) {
    return allowLinkedPartnerFallback(partnerId, requiredScopes)
  }

  try {
    const consent = await consentDelegate.findFirst({
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
    if (isConsentStorageUnavailable(error)) {
      return allowLinkedPartnerFallback(partnerId, requiredScopes)
    }

    throw error
  }
}
