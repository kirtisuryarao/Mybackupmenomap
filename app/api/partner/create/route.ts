import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { hashPassword } from '@/lib/auth'
import { authenticateRequest } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'


const createPartnerSchema = z.object({
  name: z.string().min(1, 'Partner name is required').max(100),
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) return authResult.error

    const { user } = authResult
    const body = await request.json()
    const data = createPartnerSchema.parse(body)

    const existingPartner = await prisma.partner.findUnique({
      where: { email: data.email },
      select: { id: true },
    })

    if (existingPartner) {
      return NextResponse.json(
        { error: 'This email is already registered as a partner' },
        { status: 409 }
      )
    }

    const passwordHash = await hashPassword(data.password)

    const partner = await prisma.partner.create({
      data: {
        userId: user.userId,
        name: data.name,
        email: data.email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    })

    return NextResponse.json(partner, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Validation error' },
        { status: 400 }
      )
    }

    console.error('Partner create error:', error)
    return NextResponse.json({ error: 'Failed to create partner' }, { status: 500 })
  }
}
