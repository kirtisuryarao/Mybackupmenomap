import { verifyPassword } from '@/lib/auth'
import { hashRefreshToken } from '@/lib/auth/jwt'
import { canUseFileAuthFallback, isPrismaConnectionError } from '@/lib/db-fallback'
import { findFileUserById } from '@/lib/file-auth-store'
import {
  cleanupExpiredFilePartnerRefreshTokens,
  createFilePartnerRefreshToken,
  findFilePartnerByEmail,
  findFilePartnerRefreshToken,
  revokeFilePartnerRefreshTokenById,
  revokeFilePartnerRefreshTokens,
} from '@/lib/file-partner-store'
import {
  generatePartnerTokenPair,
  verifyPartnerRefreshToken,
  type PartnerTokenPair,
} from '@/lib/partner-auth'
import { prisma } from '@/lib/prisma'

type ServiceSuccess<T> = { success: true; data: T }
type ServiceError = { success: false; status: number; error: string }
type ServiceResult<T> = ServiceSuccess<T> | ServiceError

interface SafeLinkedUser {
  id: string
  name: string
}

interface SafePartner {
  id: string
  name: string
  email: string
  linkedUser: SafeLinkedUser | null
}

interface PartnerSession {
  partner: SafePartner
  tokens: PartnerTokenPair
}

function toSafePartner(input: {
  id: string
  name: string
  email: string
  user?: { id: string; name: string } | null
}): SafePartner {
  return {
    id: input.id,
    name: input.name,
    email: input.email,
    linkedUser: input.user ? { id: input.user.id, name: input.user.name } : null,
  }
}

export async function loginPartner(email: string, password: string): Promise<ServiceResult<PartnerSession>> {
  const normalizedEmail = email.trim().toLowerCase()

  try {
    const partner = await prisma.partner.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      include: { user: { select: { id: true, name: true } } },
    })

    if (!partner || !(await verifyPassword(password, partner.passwordHash))) {
      return { success: false, status: 401, error: 'Invalid email or password' }
    }

    const tokens = generatePartnerTokenPair(partner.id, partner.email)

    await prisma.partnerRefreshToken.create({
      data: {
        partnerId: partner.id,
        tokenHash: hashRefreshToken(tokens.refreshToken),
        expiresAt: tokens.refreshTokenExpiresAt,
      },
    })
    await prisma.partnerRefreshToken.deleteMany({ where: { expiresAt: { lt: new Date() } } })

    return { success: true, data: { partner: toSafePartner(partner), tokens } }
  } catch (dbError) {
    if (!(isPrismaConnectionError(dbError) && canUseFileAuthFallback())) {
      throw dbError
    }

    const partner = await findFilePartnerByEmail(normalizedEmail)
    if (!partner || !(await verifyPassword(password, partner.passwordHash))) {
      return { success: false, status: 401, error: 'Invalid email or password' }
    }

    const tokens = generatePartnerTokenPair(partner.id, partner.email)
    await createFilePartnerRefreshToken({
      partnerId: partner.id,
      tokenHash: hashRefreshToken(tokens.refreshToken),
      expiresAt: tokens.refreshTokenExpiresAt,
    })
    await cleanupExpiredFilePartnerRefreshTokens()

    const linkedUser = await findFileUserById(partner.userId)
    return {
      success: true,
      data: {
        partner: {
          id: partner.id,
          name: partner.name,
          email: partner.email,
          linkedUser: linkedUser ? { id: linkedUser.id, name: linkedUser.name } : null,
        },
        tokens,
      },
    }
  }
}

export async function refreshPartnerSession(refreshToken: string): Promise<ServiceResult<{ accessToken: string; refreshToken: string; accessTokenExpiresAt: Date; refreshTokenExpiresAt: Date }>> {
  const payload = verifyPartnerRefreshToken(refreshToken)
  if (!payload) {
    return { success: false, status: 401, error: 'Invalid or expired refresh token' }
  }

  const tokenHash = hashRefreshToken(refreshToken)

  try {
    const stored = await prisma.partnerRefreshToken.findUnique({
      where: { tokenHash },
      include: { partner: true },
    })

    if (!stored || stored.expiresAt < new Date()) {
      return { success: false, status: 401, error: 'Invalid or expired refresh token' }
    }

    if (!stored.partner || stored.partner.id !== payload.partnerId) {
      await prisma.partnerRefreshToken.deleteMany({ where: { tokenHash } })
      return { success: false, status: 401, error: 'Partner not found' }
    }

    const tokens = generatePartnerTokenPair(stored.partner.id, stored.partner.email)

    await prisma.$transaction([
      prisma.partnerRefreshToken.delete({ where: { id: stored.id } }),
      prisma.partnerRefreshToken.create({
        data: {
          partnerId: stored.partner.id,
          tokenHash: hashRefreshToken(tokens.refreshToken),
          expiresAt: tokens.refreshTokenExpiresAt,
        },
      }),
    ])

    return {
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
      },
    }
  } catch (dbError) {
    if (!(isPrismaConnectionError(dbError) && canUseFileAuthFallback())) {
      throw dbError
    }

    const stored = await findFilePartnerRefreshToken(tokenHash)
    if (!stored || stored.revoked || new Date(stored.expiresAt) < new Date()) {
      return { success: false, status: 401, error: 'Invalid or expired refresh token' }
    }

    if (!stored.partner || stored.partner.id !== payload.partnerId) {
      await revokeFilePartnerRefreshTokenById(stored.id)
      return { success: false, status: 401, error: 'Partner not found' }
    }

    const tokens = generatePartnerTokenPair(stored.partner.id, stored.partner.email)
    await revokeFilePartnerRefreshTokenById(stored.id)
    await createFilePartnerRefreshToken({
      partnerId: stored.partner.id,
      tokenHash: hashRefreshToken(tokens.refreshToken),
      expiresAt: tokens.refreshTokenExpiresAt,
    })

    return {
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
      },
    }
  }
}

export async function logoutPartner(partnerId: string, refreshToken?: string | null): Promise<void> {
  try {
    await prisma.partnerRefreshToken.deleteMany({
      where: {
        partnerId,
        ...(refreshToken ? { tokenHash: hashRefreshToken(refreshToken) } : {}),
      },
    })
  } catch (dbError) {
    if (isPrismaConnectionError(dbError) && canUseFileAuthFallback()) {
      await revokeFilePartnerRefreshTokens(partnerId, refreshToken ? hashRefreshToken(refreshToken) : null)
      return
    }
    throw dbError
  }
}
