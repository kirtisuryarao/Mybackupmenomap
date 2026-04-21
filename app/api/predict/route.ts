import { NextRequest, NextResponse } from 'next/server'

import { createInternalErrorResponse } from '@/lib/api-error'
import { buildHybridPredictionForUser } from '@/lib/hybrid-prediction'
import { buildAlertMessage, buildSymptomInsights, isMenopauseMode, summarizeSymptoms } from '@/lib/menopause'
import { authenticateRequest } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) return authResult.error

    const { user } = authResult

    const [profile, recentHealthLogs] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.userId },
        select: { menopauseStage: true },
      }),
      prisma.healthLog.findMany({
        where: { userId: user.userId },
        orderBy: { date: 'desc' },
        take: 10,
        select: {
          date: true,
          symptoms: true,
          mood: true,
          sleepHours: true,
        },
      }),
    ])

    const symptomInsights = buildSymptomInsights(recentHealthLogs)
    const symptomSummary = summarizeSymptoms(recentHealthLogs)
    const alertMessage = buildAlertMessage(symptomInsights, symptomSummary)

    if (isMenopauseMode(profile?.menopauseStage)) {
      return NextResponse.json({
        mode: 'menopause',
        menopauseModeActive: true,
        menopauseStage: profile?.menopauseStage,
        symptomInsights,
        alertMessage,
        symptomSummary,
      })
    }

    const prediction = await buildHybridPredictionForUser(user.userId, {
      includeExplanation: true,
      persist: true,
    })

    return NextResponse.json({
      mode: 'cycle',
      menopauseModeActive: false,
      menopauseStage: profile?.menopauseStage || 'regular',
      symptomInsights,
      alertMessage,
      symptomSummary,
      ...prediction,
    })
  } catch (error) {
    return createInternalErrorResponse(error, 'Predict error', 'Failed to generate prediction')
  }
}
