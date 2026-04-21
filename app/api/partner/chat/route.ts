import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getCycleData } from '@/lib/get-cycle-data'
import { validatePartnerRequest } from '@/lib/partner-auth'
import { prisma } from '@/lib/prisma'
import { assertPartnerConsent } from '@/lib/services/consent-service'
import { getPartnerInsights, type PartnerConsentScope } from '@/lib/services/partner-insights'

const partnerChatSchema = z.object({
  message: z.string().min(1).max(2000),
})

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured')
  }
  return new Groq({ apiKey })
}

function buildFallbackAnswer(message: string, insights: ReturnType<typeof getPartnerInsights>, userName: string) {
  const question = message.toLowerCase()

  if (question.includes('safe')) {
    return insights.is_safe_day
      ? `Today looks like a safer day outside the fertile window. ${userName} is in the ${insights.phase.toLowerCase()} phase, so the priority is still ${insights.support_advice.toLowerCase()}`
      : `Today is inside the fertile window, so it is not considered a safe day for pregnancy avoidance. Fertility is ${insights.fertility_status.toLowerCase()} right now.`
  }

  if (question.includes('feel') || question.includes('mood') || question.includes('why')) {
    return `${userName} may feel ${insights.mood_tendency.toLowerCase()} with ${insights.energy_level.toLowerCase()} energy during the ${insights.phase.toLowerCase()} phase. ${insights.warnings[0] || insights.support_advice}`
  }

  return `${insights.support_advice} Likely mood: ${insights.mood_tendency}. Energy: ${insights.energy_level}. ${insights.relationship_insights[0] || ''}`.trim()
}

export async function POST(request: NextRequest) {
  try {
    const { partnerId, error } = await validatePartnerRequest(request)
    if (!partnerId || error) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    const consent = await assertPartnerConsent(partnerId, ['cycle'])
    if (!consent.allowed) {
      return NextResponse.json({ error: consent.error }, { status: consent.status })
    }

    const body = await request.json()
    const { message } = partnerChatSchema.parse(body)

    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            cycleLength: true,
            periodDuration: true,
          },
        },
      },
    })

    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    }

    const cycleData = await getCycleData(partner.userId)
    if (!cycleData.lastPeriodDate) {
      return NextResponse.json({ error: 'No cycle data available yet' }, { status: 404 })
    }

    const recentLogs = await prisma.dailyLog.findMany({
      where: { userId: partner.userId },
      orderBy: { date: 'desc' },
      take: 45,
    })

    const insights = getPartnerInsights({
      userName: partner.user.name,
      lastPeriodDate: cycleData.lastPeriodDate,
      cycleLength: cycleData.cycleLength || partner.user.cycleLength,
      periodLength: partner.user.periodDuration,
      recentLogs,
      consentScopes: consent.scopes as PartnerConsentScope[],
    })

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ response: buildFallbackAnswer(message, insights, partner.user.name) })
    }

    const groq = getGroqClient()
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      temperature: 0.3,
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content: 'You are MenoMap Partner AI. Answer as a caring, practical assistant for a partner supporting someone through their menstrual cycle. Stay concrete, non-judgmental, and personalized to the provided cycle context. Do not give medical diagnosis. If the user asks about fertility safety, explain the fertile window clearly and cautiously.',
        },
        {
          role: 'system',
          content: [
            `Partner is viewing data for: ${partner.user.name}`,
            `Current cycle day: ${insights.current_day}`,
            `Phase: ${insights.phase}`,
            `Fertility status: ${insights.fertility_status}`,
            `Safe day: ${insights.is_safe_day ? 'yes' : 'no'}`,
            `Ovulation day: ${insights.ovulation_day}`,
            `Fertile window: days ${insights.fertile_window[0]}-${insights.fertile_window[1]}`,
            `Mood tendency: ${insights.mood_tendency}`,
            `Energy level: ${insights.energy_level}`,
            `Support advice: ${insights.support_advice}`,
            `Warnings: ${insights.warnings.join('; ') || 'none'}`,
            `Actions: ${insights.support_actions.join('; ')}`,
            `Relationship insights: ${insights.relationship_insights.join('; ')}`,
            `Pattern insights: ${insights.pattern_insights.join('; ')}`,
          ].join('\n'),
        },
        {
          role: 'user',
          content: message,
        },
      ],
    })

    const responseText = completion.choices[0]?.message?.content?.trim()
    if (!responseText) {
      return NextResponse.json({ response: buildFallbackAnswer(message, insights, partner.user.name) })
    }

    return NextResponse.json({ response: responseText })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || 'Validation error' }, { status: 400 })
    }

    console.error('Partner chat error:', error)
    return NextResponse.json({ error: 'Failed to generate partner response' }, { status: 500 })
  }
}