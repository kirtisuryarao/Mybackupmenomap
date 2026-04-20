import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createInternalErrorResponse } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { authenticateRequest } from '@/lib/middleware'
import { generateHealthResponse } from '@/lib/services/aiService'
import { createMessage, getChatHistory, storeAIResponse } from '@/lib/services/chatService'
import { detectRedFlags, maskSensitiveSymptoms } from '@/lib/services/safetyService'

const DISCLAIMER = 'This is not medical advice. Consult a healthcare professional.'
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 6
const userQueryRateLimit = new Map<string, { count: number; windowStart: number }>()

const aiQuerySchema = z.object({
  query: z.string().min(3).max(1200),
})

function checkRateLimit(userId: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now()
  const current = userQueryRateLimit.get(userId)

  if (!current || now - current.windowStart >= RATE_LIMIT_WINDOW_MS) {
    userQueryRateLimit.set(userId, { count: 1, windowStart: now })
    return { allowed: true }
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterMs = RATE_LIMIT_WINDOW_MS - (now - current.windowStart)
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    }
  }

  current.count += 1
  userQueryRateLimit.set(userId, current)
  return { allowed: true }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) return authResult.error

    const rateLimit = checkRateLimit(authResult.user.userId)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many assistant requests. Please wait before trying again.',
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSeconds ?? 1),
          },
        }
      )
    }

    const body = await request.json()
    const validated = aiQuerySchema.parse(body)

    const maskedPreview = maskSensitiveSymptoms(validated.query).slice(0, 120)

    await createMessage(authResult.user.userId, 'user', validated.query)

    logger.event({
      userId: authResult.user.userId,
      event: 'ai.query.received',
      status: 'info',
      metadata: {
        queryPreviewMasked: maskedPreview,
        queryLength: validated.query.length,
      },
    })

    const safetyAlert = await detectRedFlags(authResult.user.userId, validated.query)

    if (safetyAlert) {
      logger.event({
        userId: authResult.user.userId,
        event: 'ai.query.red_flag',
        status: 'info',
        metadata: { reason: safetyAlert.reason },
      })

      await storeAIResponse(authResult.user.userId, safetyAlert.message)

      const messages = await getChatHistory(authResult.user.userId)

      return NextResponse.json({
        type: 'alert',
        response: safetyAlert.message,
        message: 'You should seek medical attention',
        urgency: safetyAlert.urgency,
        disclaimer: DISCLAIMER,
        confidence: 'high' as const,
        messages,
      })
    }

    const aiResult = await generateHealthResponse(authResult.user.userId, validated.query)
    await storeAIResponse(authResult.user.userId, aiResult.response)

    const messages = await getChatHistory(authResult.user.userId)
    return NextResponse.json({
      ...aiResult,
      messages,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return createInternalErrorResponse(error, 'AI query error', 'Failed to process AI query')
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) return authResult.error

    const messages = await getChatHistory(authResult.user.userId)
    return NextResponse.json({ messages })
  } catch (error) {
    return createInternalErrorResponse(error, 'AI history error', 'Failed to fetch chat history')
  }
}
