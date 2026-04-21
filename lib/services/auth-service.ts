import { hashPassword, verifyPassword } from '@/lib/auth'
import {
  hashRefreshToken,
  issueTokenPair,
  verifyRefreshToken,
  type IssuedTokenPair,
} from '@/lib/auth/jwt'
import { canUseFileAuthFallback, isPrismaConnectionError } from '@/lib/db-fallback'
import {
  cleanupExpiredFileRefreshTokens,
  createFileRefreshToken,
  createFileUser,
  findFileRefreshToken,
  findFileUserByEmail,
  revokeFileRefreshTokenById,
  revokeFileRefreshTokensByUser,
} from '@/lib/file-auth-store'
import { prisma } from '@/lib/prisma'

interface SafeUser {
  id: string
  email: string
  name: string
  age: number | null
  cycleLength: number
  periodLength: number
  periodDuration: number
  menopauseStage: 'regular' | 'irregular' | 'perimenopause' | 'menopause'
}

type ServiceSuccess<T> = { success: true; data: T }
type ServiceError = { success: false; status: number; error: string }
type ServiceResult<T> = ServiceSuccess<T> | ServiceError

export interface SignupInput {
  name: string
  email: string
  password: string
  age: number
  lastPeriodDate?: string
  cycleLength: number
  periodLength: number
  menopauseStage: 'regular' | 'irregular' | 'perimenopause' | 'menopause'
}

export interface LoginInput {
  email: string
  password: string
}

export interface AuthSession {
  user: SafeUser
  tokens: IssuedTokenPair
}

function toSafeUser(user: {
  id: string
  email: string
  name: string
  age?: number | null
  cycleLength: number
  periodLength?: number | null
  periodDuration?: number | null
  menopauseStage?: 'regular' | 'irregular' | 'perimenopause' | 'menopause' | null
}): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    age: user.age ?? null,
    cycleLength: user.cycleLength,
    periodLength: user.periodLength ?? 5,
    periodDuration: user.periodDuration ?? 5,
    menopauseStage: user.menopauseStage ?? 'regular',
  }
}

async function persistRefreshToken(userId: string, tokens: IssuedTokenPair) {
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashRefreshToken(tokens.refreshToken),
      expiresAt: tokens.refreshTokenExpiresAt,
    },
  })
}

async function persistFileRefreshToken(userId: string, tokens: IssuedTokenPair) {
  await createFileRefreshToken({
    userId,
    tokenHash: hashRefreshToken(tokens.refreshToken),
    expiresAt: tokens.refreshTokenExpiresAt,
  })
}

export async function signupUser(input: SignupInput): Promise<ServiceResult<AuthSession>> {
  const normalizedEmail = input.email.trim().toLowerCase()

  try {
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existingUser) {
      return { success: false, status: 409, error: 'User with this email already exists' }
    }

    const passwordHash = await hashPassword(input.password)
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          name: input.name,
          age: input.age,
          cycleLength: input.cycleLength,
          periodLength: input.periodLength,
          periodDuration: input.periodLength,
          menopauseStage: input.menopauseStage,
        },
      })

      if (input.lastPeriodDate) {
        await tx.cycleEntry.create({
          data: {
            userId: createdUser.id,
            lastPeriodDate: new Date(input.lastPeriodDate),
            cycleLength: input.cycleLength,
          },
        })
      }

      await tx.notificationSettings.create({ data: { userId: createdUser.id } })
      await tx.privacySettings.create({ data: { userId: createdUser.id } })

      return createdUser
    })

    const tokens = issueTokenPair({ userId: user.id, email: user.email })
    await persistRefreshToken(user.id, tokens)

    return { success: true, data: { user: toSafeUser(user), tokens } }
  } catch (error) {
    if (!(isPrismaConnectionError(error) && canUseFileAuthFallback())) {
      throw error
    }

    const existingUser = await findFileUserByEmail(normalizedEmail)
    if (existingUser) {
      return { success: false, status: 409, error: 'User with this email already exists' }
    }

    const passwordHash = await hashPassword(input.password)
    const user = await createFileUser({
      email: normalizedEmail,
      passwordHash,
      name: input.name,
      age: input.age,
      cycleLength: input.cycleLength,
      periodLength: input.periodLength,
      menopauseStage: input.menopauseStage,
      lastPeriodDate: input.lastPeriodDate,
    })

    const tokens = issueTokenPair({ userId: user.id, email: user.email })
    await persistFileRefreshToken(user.id, tokens)

    return { success: true, data: { user: toSafeUser(user), tokens } }
  }
}

export async function loginUser(input: LoginInput): Promise<ServiceResult<AuthSession>> {
  const normalizedEmail = input.email.trim().toLowerCase()

  try {
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (!user) {
      return { success: false, status: 401, error: 'Invalid email or password' }
    }

    const isValidPassword = await verifyPassword(input.password, user.passwordHash)
    if (!isValidPassword) {
      return { success: false, status: 401, error: 'Invalid email or password' }
    }

    await prisma.chatMessage.deleteMany({ where: { userId: user.id } })

    const tokens = issueTokenPair({ userId: user.id, email: user.email })
    await persistRefreshToken(user.id, tokens)
    await prisma.refreshToken.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date() } }, { revoked: true }] } })

    return { success: true, data: { user: toSafeUser(user), tokens } }
  } catch (error) {
    if (!(isPrismaConnectionError(error) && canUseFileAuthFallback())) {
      throw error
    }

    const user = await findFileUserByEmail(normalizedEmail)
    if (!user) {
      return { success: false, status: 401, error: 'Invalid email or password' }
    }

    const isValidPassword = await verifyPassword(input.password, user.passwordHash)
    if (!isValidPassword) {
      return { success: false, status: 401, error: 'Invalid email or password' }
    }

    const tokens = issueTokenPair({ userId: user.id, email: user.email })
    await persistFileRefreshToken(user.id, tokens)
    await cleanupExpiredFileRefreshTokens()

    return { success: true, data: { user: toSafeUser(user), tokens } }
  }
}

export async function refreshUserSession(refreshToken: string): Promise<ServiceResult<AuthSession>> {
  let payload

  try {
    payload = verifyRefreshToken(refreshToken)
  } catch {
    return { success: false, status: 401, error: 'Invalid or expired refresh token' }
  }

  const tokenHash = hashRefreshToken(refreshToken)

  try {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    })

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      return { success: false, status: 401, error: 'Invalid or expired refresh token' }
    }

    if (!storedToken.user || storedToken.user.id !== payload.userId) {
      await prisma.refreshToken.updateMany({ where: { tokenHash }, data: { revoked: true } })
      return { success: false, status: 401, error: 'User not found' }
    }

    const tokens = issueTokenPair({ userId: storedToken.user.id, email: storedToken.user.email })

    await prisma.$transaction([
      prisma.refreshToken.update({ where: { id: storedToken.id }, data: { revoked: true } }),
      prisma.refreshToken.create({
        data: {
          userId: storedToken.user.id,
          tokenHash: hashRefreshToken(tokens.refreshToken),
          expiresAt: tokens.refreshTokenExpiresAt,
        },
      }),
    ])

    return { success: true, data: { user: toSafeUser(storedToken.user), tokens } }
  } catch (error) {
    if (!(isPrismaConnectionError(error) && canUseFileAuthFallback())) {
      throw error
    }

    const storedToken = await findFileRefreshToken(tokenHash)
    if (!storedToken || storedToken.revoked || new Date(storedToken.expiresAt) < new Date()) {
      return { success: false, status: 401, error: 'Invalid or expired refresh token' }
    }

    if (!storedToken.user || storedToken.user.id !== payload.userId) {
      await revokeFileRefreshTokenById(storedToken.id)
      return { success: false, status: 401, error: 'User not found' }
    }

    const tokens = issueTokenPair({ userId: storedToken.user.id, email: storedToken.user.email })
    await revokeFileRefreshTokenById(storedToken.id)
    await persistFileRefreshToken(storedToken.user.id, tokens)

    return { success: true, data: { user: toSafeUser(storedToken.user), tokens } }
  }
}

export async function logoutUser(userId: string, refreshToken?: string | null): Promise<void> {
  const tokenHash = refreshToken ? hashRefreshToken(refreshToken) : null

  try {
    await prisma.refreshToken.updateMany({
      where: {
        userId,
        revoked: false,
        ...(tokenHash ? { tokenHash } : {}),
      },
      data: { revoked: true },
    })
  } catch (error) {
    if (isPrismaConnectionError(error) && canUseFileAuthFallback()) {
      await revokeFileRefreshTokensByUser(userId, tokenHash)
      return
    }

    throw error
  }
}
