import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/middleware'
import { createInternalErrorResponse } from '@/lib/api-error'
import { z } from 'zod'

const addPartnerSchema = z.object({
  name: z.string().min(1, 'Partner name is required'),
  phone: z.string().min(1, 'Phone number is required'),
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
      orderBy: { addedDate: 'desc' },
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

    const partner = await prisma.partner.create({
      data: {
        userId: user.userId,
        name: validatedData.name,
        phone: validatedData.phone,
      },
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
