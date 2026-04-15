import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { authenticateRequest } from '@/lib/middleware'
import { hashPassword } from '@/lib/auth'

const partnerRegisterSchema = z.object({
  name: z.string().min(1, 'Partner name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) return authResult.error

    const { user } = authResult
    const body = await request.json()
    
    // Validate input
    const validatedData = partnerRegisterSchema.parse(body)

    // Check if email already exists in partners
    const existingPartner = await prisma.partner.findUnique({
      where: { email: validatedData.email },
    })

    if (existingPartner) {
      return NextResponse.json(
        { error: 'This email is already registered as a partner' },
        { status: 409 }
      )
    }

    // Check if this user already has this partner email
    const userPartner = await prisma.partner.findFirst({
      where: {
        userId: user.userId,
        email: validatedData.email,
      },
    })

    if (userPartner) {
      return NextResponse.json(
        { error: 'This partner already exists for this user' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(validatedData.password)

    // Create partner
    const partner = await prisma.partner.create({
      data: {
        userId: user.userId,
        name: validatedData.name,
        email: validatedData.email,
        passwordHash,
      },
    })

    return NextResponse.json({
      success: true,
      partner: {
        id: partner.id,
        name: partner.name,
        email: partner.email,
        createdAt: partner.createdAt,
      },
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    
    console.error('Partner registration error:', error)
    return NextResponse.json(
      { error: 'An error occurred during partner registration' },
      { status: 500 }
    )
  }
}
