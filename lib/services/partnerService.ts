import { hashPassword } from '@/lib/auth'
import { canUseFileAuthFallback, isPrismaConnectionError } from '@/lib/db-fallback'
import {
  createFilePartner,
  findFilePartnerByEmail,
  findFilePartnersByUserId,
} from '@/lib/file-partner-store'
import { prisma } from '@/lib/prisma'

type ServiceSuccess<T> = { success: true; status: number; data: T }
type ServiceError = { success: false; status: number; error: string }
type ServiceResult<T> = ServiceSuccess<T> | ServiceError

export interface PartnerDTO {
  id: string
  name: string
  email: string
  createdAt: Date | string
}

export interface CreatePartnerParams {
  userId: string
  name: string
  email: string
  password: string
  relationshipType?: string
}

export async function createPartner(input: CreatePartnerParams): Promise<ServiceResult<PartnerDTO>> {
  const normalizedEmail = input.email.toLowerCase()
  const passwordHash = await hashPassword(input.password)

  try {
    const existingPartner = await prisma.partner.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      select: { id: true },
    })

    if (existingPartner) {
      return { success: false, status: 409, error: 'This email is already registered as a partner' }
    }

    const partner = await prisma.partner.create({
      data: {
        userId: input.userId,
        name: input.name,
        email: normalizedEmail,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    })

    return { success: true, status: 201, data: partner }
  } catch (dbError) {
    if (!(isPrismaConnectionError(dbError) && canUseFileAuthFallback())) {
      throw dbError
    }

    const existing = await findFilePartnerByEmail(normalizedEmail)
    if (existing) {
      return { success: false, status: 409, error: 'This email is already registered as a partner' }
    }

    const partner = await createFilePartner({
      userId: input.userId,
      name: input.name,
      email: normalizedEmail,
      passwordHash,
    })

    return {
      success: true,
      status: 201,
      data: {
        id: partner.id,
        name: partner.name,
        email: partner.email,
        createdAt: partner.createdAt,
      },
    }
  }
}

export async function getPartners(userId: string): Promise<ServiceResult<PartnerDTO[]>> {
  try {
    const partners = await prisma.partner.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    })

    return { success: true, status: 200, data: partners }
  } catch (dbError) {
    if (!(isPrismaConnectionError(dbError) && canUseFileAuthFallback())) {
      throw dbError
    }

    const partners = await findFilePartnersByUserId(userId)

    return {
      success: true,
      status: 200,
      data: partners
        .map((partner) => ({
          id: partner.id,
          name: partner.name,
          email: partner.email,
          createdAt: partner.createdAt,
        }))
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    }
  }
}

export async function linkPartnerToUser(
  partnerId: string,
  userId: string
): Promise<ServiceResult<PartnerDTO>> {
  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    select: { id: true, name: true, email: true, createdAt: true },
  })

  if (!partner) {
    return { success: false, status: 404, error: 'Partner not found' }
  }

  const updated = await prisma.partner.update({
    where: { id: partnerId },
    data: { userId },
    select: { id: true, name: true, email: true, createdAt: true },
  })

  return { success: true, status: 200, data: updated }
}
