import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createInternalErrorResponse } from '@/lib/api-error'
import { authenticateRequest } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'


const notificationSchema = z.object({
  periodReminder: z.boolean().optional(),
  phaseChange: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
})

const privacySchema = z.object({
  profilePublic: z.boolean().optional(),
  shareWithPartner: z.boolean().optional(),
  allowHealthInsight: z.boolean().optional(),
})

const updateSettingsSchema = z.object({
  notifications: notificationSchema.optional(),
  privacy: privacySchema.optional(),
})

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) {
      return authResult.error
    }

    const { user } = authResult

    const [notifications, privacy] = await Promise.all([
      prisma.notificationSettings.findUnique({
        where: { userId: user.userId },
      }),
      prisma.privacySettings.findUnique({
        where: { userId: user.userId },
      }),
    ])

    return NextResponse.json({
      notifications: notifications
        ? {
            periodReminder: notifications.periodReminder,
            phaseChange: notifications.phaseChange,
            pushNotifications: notifications.pushNotifications,
            emailNotifications: notifications.emailNotifications,
          }
        : {
            periodReminder: true,
            phaseChange: true,
            pushNotifications: false,
            emailNotifications: false,
          },
      privacy: privacy
        ? {
            profilePublic: privacy.profilePublic,
            shareWithPartner: privacy.shareWithPartner,
            allowHealthInsight: privacy.allowHealthInsight,
          }
        : {
            profilePublic: false,
            shareWithPartner: false,
            allowHealthInsight: true,
          },
    })
  } catch (error) {
    console.error('GET /api/settings error:', error)
    return createInternalErrorResponse(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) {
      return authResult.error
    }

    const { user } = authResult
    const body = await request.json()
    const validatedData = updateSettingsSchema.parse(body)

    if (validatedData.notifications) {
      await prisma.notificationSettings.upsert({
        where: { userId: user.userId },
        create: {
          userId: user.userId,
          ...validatedData.notifications,
        },
        update: validatedData.notifications,
      })
    }

    if (validatedData.privacy) {
      await prisma.privacySettings.upsert({
        where: { userId: user.userId },
        create: {
          userId: user.userId,
          ...validatedData.privacy,
        },
        update: validatedData.privacy,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH /api/settings error:', error)
    return createInternalErrorResponse(error)
  }
}
