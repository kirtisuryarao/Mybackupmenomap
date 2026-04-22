import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createInternalErrorResponse } from '@/lib/api-error'
import { hashPassword } from '@/lib/auth'
import { authenticateRequest } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { grantConsent } from '@/lib/services/consent-service'

const addPartnerSchema = z.object({
  name: z.string().min(1, 'Partner name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) {
      return authResult.error
    }

    const { user } = authResult

    const partners = await prisma.partner.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    })

    return NextResponse.json(partners)
  } catch (error) {
    return createInternalErrorResponse(error, 'Get partners error', 'Failed to get partners')
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) {
      return authResult.error
    }

    const { user } = authResult
    const body = await request.json()
    
    const validatedData = addPartnerSchema.parse(body)

    const existingEmail = await prisma.partner.findUnique({
      where: { email: validatedData.email },
      select: { id: true },
    })

    if (existingEmail) {
      return NextResponse.json(
        { error: 'This email is already registered as a partner' },
        { status: 409 }
      )
    }

    const passwordHash = await hashPassword(validatedData.password)

    const partner = await prisma.partner.create({
      data: {
        userId: user.userId,
        name: validatedData.name,
        email: validatedData.email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    })

    // Ensure partner access works immediately with the baseline cycle scope.
    await grantConsent({
      userId: user.userId,
      partnerId: partner.id,
      scopes: ['cycle'],
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    })

    return NextResponse.json(partner, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return createInternalErrorResponse(error, 'Add partner error', 'Failed to add partner')
  }
}
