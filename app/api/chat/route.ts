import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createInternalErrorResponse } from '@/lib/api-error'
import { getDayInfo } from '@/lib/cycle-calculations'
import { getCycleData } from '@/lib/get-cycle-data'
import { authenticateRequest } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

const sendMessageSchema = z.object({
  message: z.string().min(1).max(5000),
  stream: z.boolean().optional().default(false),
})

const SYSTEM_PROMPT = `You are a smart AI assistant like ChatGPT, embedded in MenoMap — a menstrual health tracking app.
You can answer ANY question: math, coding, science, general knowledge, health, etc.
Give short, clear, human-like responses (1-3 sentences by default). Expand only if the user asks.
If the question is about menstrual health, periods, or cycle-related topics, use the user's cycle data provided in context.
Never mention API keys, technical errors, or internal details.
Be warm, accurate, and helpful.`

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured')
  }
  return new Groq({ apiKey })
}

// ── GET: Chat history ──────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) return authResult.error

    const { user } = authResult
    const messages = await prisma.chatMessage.findMany({
      where: { userId: user.userId },
      orderBy: { timestamp: 'asc' },
      take: 50,
    })

    return NextResponse.json({ messages })
  } catch (error) {
    return createInternalErrorResponse(error, 'Get chat error', 'Failed to fetch chat history')
  }
}

// ── POST: Send message (supports streaming) ────────────────────────

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) return authResult.error

    const { user } = authResult
    const body = await request.json()
    const { message, stream } = sendMessageSchema.parse(body)

    // Save user message
    await prisma.chatMessage.create({
      data: { userId: user.userId, role: 'user', content: message },
    })

    // Build LLM messages
    const [context, history] = await Promise.all([
      getUserCycleContext(user.userId),
      prisma.chatMessage.findMany({
        where: { userId: user.userId },
        orderBy: { timestamp: 'desc' },
        take: 20,
      }),
    ])

    const llmMessages = buildLLMMessages(context, history.reverse())

    const groq = getGroqClient()
    const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant'

    // ── Streaming response ──
    if (stream) {
      const completion = await groq.chat.completions.create({
        model,
        temperature: 0.4,
        max_tokens: 1024,
        stream: true,
        messages: llmMessages,
      })

      const encoder = new TextEncoder()
      let fullContent = ''

      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of completion) {
              const delta = chunk.choices[0]?.delta?.content || ''
              if (delta) {
                fullContent += delta
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`))
              }
            }
            // Save the complete assistant message
            const saved = await prisma.chatMessage.create({
              data: { userId: user.userId, role: 'assistant', content: fullContent.trim() },
            })
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, messageId: saved.id })}\n\n`))
            controller.close()
          } catch (err) {
            console.error('Stream error:', err)
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: true })}\n\n`))
            controller.close()
          }
        },
      })

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    // ── Non-streaming response ──
    const completion = await groq.chat.completions.create({
      model,
      temperature: 0.4,
      max_tokens: 1024,
      messages: llmMessages,
    })

    const content = completion.choices[0]?.message?.content?.trim()
    if (!content) throw new Error('Empty LLM response')

    const assistantMessage = await prisma.chatMessage.create({
      data: { userId: user.userId, role: 'assistant', content },
    })

    return NextResponse.json({ messageId: assistantMessage.id, response: content }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Chat API error:', error)
    // Generic user-friendly error — never reveals internals
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}

// ── DELETE: Clear chat history ─────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) return authResult.error

    const { user } = authResult
    await prisma.chatMessage.deleteMany({ where: { userId: user.userId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return createInternalErrorResponse(error, 'Clear chat error', 'Failed to clear chat')
  }
}

// ── Helpers ────────────────────────────────────────────────────────

interface CycleContext {
  cycleDay: number | null
  phase: string | null
  cycleLength: number | null
  lastPeriodDate: string | null
  nextPeriodDate: string | null
  symptoms: string[]
}

async function getUserCycleContext(userId: string): Promise<CycleContext> {
  try {
    // Use shared utility to get fresh cycle data - SAME SOURCE AS CALENDAR
    const cycleData = await getCycleData(userId)
    const [log] = await Promise.all([
      prisma.dailyLog.findFirst({
        where: { userId },
        orderBy: { date: 'desc' },
        select: { symptoms: true },
      }),
    ])

    if (!cycleData.hasCycleData) {
      console.error(`[Chat] User ${userId}: No cycle data available`)
      return {
        cycleDay: null,
        phase: null,
        cycleLength: null,
        lastPeriodDate: null,
        nextPeriodDate: null,
        symptoms: log?.symptoms ?? [],
      }
    }

    // Calculate current cycle day and phase from the fresh data
    const lastPeriod = new Date(cycleData.lastPeriodDate!)
    const info = getDayInfo(new Date(), lastPeriod, cycleData.cycleLength)
    const nextPeriod = getNextPeriodDate(lastPeriod, cycleData.cycleLength)

    console.error(`[Chat] User ${userId}: Cycle context built`, {
      cycleDay: info.dayOfCycle,
      phase: info.phase,
      cycleLength: cycleData.cycleLength,
      source: cycleData.source,
    })

    return {
      cycleDay: info.dayOfCycle,
      phase: info.phase,
      cycleLength: cycleData.cycleLength,
      lastPeriodDate: cycleData.lastPeriodDate,
      nextPeriodDate: fmtDate(nextPeriod),
      symptoms: log?.symptoms ?? [],
    }
  } catch (error) {
    console.error(`[Chat] Error getting cycle context for user ${userId}:`, error)
    return {
      cycleDay: null,
      phase: null,
      cycleLength: null,
      lastPeriodDate: null,
      nextPeriodDate: null,
      symptoms: [],
    }
  }
}

function getNextPeriodDate(lastPeriod: Date, cycleLength: number) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const next = new Date(lastPeriod)
  while (next <= today) next.setDate(next.getDate() + cycleLength)
  return next
}

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function buildLLMMessages(context: CycleContext, history: Array<{ role: string; content: string }>) {
  const contextLines = [
    'User health context (use only when relevant to the question):',
    `• Cycle day: ${context.cycleDay ?? 'not tracked'}`,
    `• Phase: ${context.phase ?? 'unknown'}`,
    `• Last period: ${context.lastPeriodDate ?? 'not tracked'}`,
    `• Next period (predicted): ${context.nextPeriodDate ?? 'not tracked'}`,
    `• Cycle length: ${context.cycleLength ? `${context.cycleLength} days` : 'not tracked'}`,
    `• Recent symptoms: ${context.symptoms.length ? context.symptoms.join(', ') : 'none'}`,
  ].join('\n')

  return [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    { role: 'system' as const, content: contextLines },
    ...history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ]
}
