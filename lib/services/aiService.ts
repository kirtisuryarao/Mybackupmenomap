import Groq from 'groq-sdk'

import { prisma } from '@/lib/prisma'
import { predictNextPeriod } from '@/lib/services/cycleService'

export type AiResponseConfidence = 'low' | 'medium' | 'high'

export interface SafeAiResult {
  type: 'normal'
  response: string
  disclaimer: string
  confidence: AiResponseConfidence
}

const DISCLAIMER = 'This is not medical advice. Consult a healthcare professional.'

export const WOMENS_HEALTH_SYSTEM_PROMPT = `You are a women’s health assistant inside a tracking app.
You are not a doctor.
Do not diagnose conditions.
Do not prescribe medication or treatment plans.
Use supportive, non-alarmist language.
Use phrases like: "may indicate", "might be related", and "consider consulting a doctor".
Keep answers simple, practical, and human-friendly.
If the user asks for urgent medical interpretation, recommend timely clinical care.
Always avoid certainty claims about diseases.`

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured')
  }
  return new Groq({ apiKey })
}

function toDayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatYmd(date: Date): string {
  const normalized = toDayStart(date)
  const year = normalized.getFullYear()
  const month = String(normalized.getMonth() + 1).padStart(2, '0')
  const day = String(normalized.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function sanitizeAssistantResponse(text: string): string {
  let output = text.trim()

  output = output.replace(/\byou have\b/gi, 'patterns may indicate')
  output = output.replace(/\bthis is definitely\b/gi, 'this may be')
  output = output.replace(/\byou need this medication\b/gi, 'please consult a licensed clinician for treatment options')

  return output
}

function deriveConfidence(input: {
  hasCyclePrediction: boolean
  symptomCount: number
  fertilitySignals: number
}): AiResponseConfidence {
  const score = Number(input.hasCyclePrediction) + (input.symptomCount > 0 ? 1 : 0) + (input.fertilitySignals > 0 ? 1 : 0)
  if (score >= 3) return 'high'
  if (score >= 2) return 'medium'
  return 'low'
}

async function getLimitedUserContext(userId: string) {
  const now = toDayStart(new Date())
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [prediction, symptomLogs, fertilityLogs] = await Promise.all([
    predictNextPeriod(userId).catch(() => null),
    prisma.symptomLog.findMany({
      where: { userId, date: { gte: thirtyDaysAgo, lte: now } },
      orderBy: { date: 'desc' },
      take: 20,
      select: { category: true, severity: true },
    }),
    prisma.fertilityLog.findMany({
      where: { userId, date: { gte: thirtyDaysAgo, lte: now } },
      orderBy: { date: 'desc' },
      take: 20,
      select: { ovulationTest: true, basalTemp: true },
    }),
  ])

  const averageSeverity =
    symptomLogs.length > 0
      ? Number((symptomLogs.reduce((sum, item) => sum + item.severity, 0) / symptomLogs.length).toFixed(2))
      : null

  const categoryCounts = symptomLogs.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1
    return acc
  }, {})

  const positiveOvulationTests = fertilityLogs.filter((item) => item.ovulationTest).length
  const tempReadings = fertilityLogs.filter((item) => typeof item.basalTemp === 'number').length

  return {
    prediction: prediction
      ? {
          nextPeriodDate: prediction.nextPeriodDate,
          ovulationDate: prediction.ovulationWindow.ovulationDate,
          fertileWindowStart: prediction.ovulationWindow.startDate,
          fertileWindowEnd: prediction.ovulationWindow.endDate,
        }
      : null,
    symptomSummary: {
      entriesInLast30Days: symptomLogs.length,
      averageSeverity,
      categoryCounts,
    },
    fertilitySummary: {
      entriesInLast30Days: fertilityLogs.length,
      positiveOvulationTests,
      temperatureReadings: tempReadings,
    },
    contextDate: formatYmd(now),
  }
}

export async function generateHealthResponse(userId: string, query: string): Promise<SafeAiResult> {
  const limitedContext = await getLimitedUserContext(userId)

  const groq = getGroqClient()
  const model = process.env.GROQ_HEALTH_MODEL || process.env.GROQ_MODEL || 'llama-3.1-8b-instant'

  const completion = await groq.chat.completions.create({
    model,
    temperature: 0.3,
    max_tokens: 700,
    messages: [
      { role: 'system', content: WOMENS_HEALTH_SYSTEM_PROMPT },
      {
        role: 'system',
        content: `User-safe summary context (limited, do not infer beyond this): ${JSON.stringify(limitedContext)}`,
      },
      { role: 'user', content: query },
    ],
  })

  const rawResponse = completion.choices[0]?.message?.content?.trim() ||
    'I can share general guidance, but I need a little more detail about your question.'

  const response = sanitizeAssistantResponse(rawResponse)
  const confidence = deriveConfidence({
    hasCyclePrediction: Boolean(limitedContext.prediction),
    symptomCount: limitedContext.symptomSummary.entriesInLast30Days,
    fertilitySignals:
      limitedContext.fertilitySummary.positiveOvulationTests +
      limitedContext.fertilitySummary.temperatureReadings,
  })

  return {
    type: 'normal',
    response,
    disclaimer: DISCLAIMER,
    confidence,
  }
}
