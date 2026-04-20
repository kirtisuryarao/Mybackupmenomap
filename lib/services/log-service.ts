import { recomputeCycleForUser, validateFlowEntryLength } from '@/lib/cycle-recalculation'
import { isPrismaConnectionError, canUseFileAuthFallback } from '@/lib/db-fallback'
import {
  deleteFileDailyLogById,
  getFileDailyLogs,
  upsertFileDailyLog,
} from '@/lib/file-log-store'
import { prisma } from '@/lib/prisma'

export interface DailyLogInput {
  userId: string
  date: string
  flow?: string | null
  spotting?: string | null
  mood: string[]
  symptoms: string[]
  temperature?: number | null
  sleepQuality?: string | null
  notes?: string | null
  isPeriodStart?: boolean
}

export async function getLogs(userId: string, opts: { from?: string; to?: string; limit: number }) {
  const where: Record<string, unknown> = { userId }
  if (opts.from || opts.to) {
    where.date = {}
    if (opts.from) (where.date as Record<string, unknown>).gte = new Date(`${opts.from}T00:00:00`)
    if (opts.to)   (where.date as Record<string, unknown>).lte = new Date(`${opts.to}T00:00:00`)
  }

  try {
    const logs = await prisma.dailyLog.findMany({
      where,
      orderBy: { date: 'desc' },
      take: Math.min(opts.limit, 365),
    })
    return {
      logs: logs.map((log) => ({
        id: log.id,
        date: log.date.toISOString().split('T')[0],
        flow: log.flow,
        spotting: log.spotting,
        mood: log.mood,
        symptoms: log.symptoms,
        temperature: log.temperature,
        sleepQuality: log.sleepQuality,
        notes: log.notes,
        createdAt: log.createdAt.toISOString(),
      })),
      source: 'database' as const,
    }
  } catch (dbError) {
    if (isPrismaConnectionError(dbError) && canUseFileAuthFallback()) {
      const logs = await getFileDailyLogs(userId, opts.limit)
      return {
        logs: logs.map((log) => ({
          id: log.id,
          date: log.date,
          flow: log.flow,
          spotting: log.spotting,
          mood: log.mood,
          symptoms: log.symptoms,
          temperature: log.temperature,
          sleepQuality: log.sleepQuality,
          notes: log.notes,
          createdAt: log.createdAt,
        })),
        source: 'file' as const,
        warning: 'Database unavailable - serving logs from local fallback storage.',
      }
    }
    throw dbError
  }
}

export async function upsertLog(input: DailyLogInput) {
  const logDate = new Date(`${input.date}T00:00:00`)
  const shouldValidateFlow = !!input.flow || input.isPeriodStart

  let normalizedFlow = input.flow || null
  let warning: string | null = null

  if (shouldValidateFlow) {
    const canSaveFlow = await validateFlowEntryLength(input.userId, logDate, 7)
    if (!canSaveFlow) {
      normalizedFlow = null
      warning = 'Flow not saved because period length exceeded the 7-day validation limit.'
    }
  }

  const fields = {
    flow: normalizedFlow,
    spotting: input.spotting || null,
    mood: input.mood,
    symptoms: input.symptoms,
    temperature: input.temperature || null,
    sleepQuality: input.sleepQuality || null,
    notes: input.notes || null,
  }

  try {
    const log = await prisma.dailyLog.upsert({
      where: { userId_date: { userId: input.userId, date: logDate } },
      create: { userId: input.userId, date: logDate, ...fields },
      update: fields,
    })

    const recalc = await recomputeCycleForUser(input.userId, { persist: true })

    return {
      log: {
        id: log.id,
        date: log.date.toISOString().split('T')[0],
        flow: log.flow,
        spotting: log.spotting,
        mood: log.mood,
        symptoms: log.symptoms,
        temperature: log.temperature,
        sleepQuality: log.sleepQuality,
        notes: log.notes,
      },
      warning,
      source: 'database' as const,
      cycle: {
        hasCycleData: recalc.hasCycleData,
        lastPeriodDate: recalc.lastPeriodDate,
        cycleLength: recalc.cycleLength,
        prediction: recalc.prediction,
      },
    }
  } catch (dbError) {
    if (!(isPrismaConnectionError(dbError) && canUseFileAuthFallback())) throw dbError

    const fallbackLog = await upsertFileDailyLog({ userId: input.userId, date: input.date, ...fields })

    return {
      log: {
        id: fallbackLog.id,
        date: fallbackLog.date,
        flow: fallbackLog.flow,
        spotting: fallbackLog.spotting,
        mood: fallbackLog.mood,
        symptoms: fallbackLog.symptoms,
        temperature: fallbackLog.temperature,
        sleepQuality: fallbackLog.sleepQuality,
        notes: fallbackLog.notes,
      },
      warning: warning || 'Database unavailable - saved to local fallback storage. Data can be synced once DB is restored.',
      source: 'file' as const,
      cycle: { hasCycleData: false, lastPeriodDate: null, cycleLength: 28, prediction: null },
    }
  }
}

export async function deleteLog(userId: string, logId: string) {
  try {
    const log = await prisma.dailyLog.findUnique({ where: { id: logId } })

    if (!log) return { success: false as const, status: 404, error: 'Log not found' }
    if (log.userId !== userId) return { success: false as const, status: 403, error: 'Unauthorized' }

    await prisma.dailyLog.delete({ where: { id: logId } })
    const recalc = await recomputeCycleForUser(userId, { persist: true })

    return {
      success: true as const,
      source: 'database' as const,
      cycle: {
        hasCycleData: recalc.hasCycleData,
        lastPeriodDate: recalc.lastPeriodDate,
        cycleLength: recalc.cycleLength,
        prediction: recalc.prediction,
      },
    }
  } catch (dbError) {
    if (isPrismaConnectionError(dbError) && canUseFileAuthFallback()) {
      const deleted = await deleteFileDailyLogById(userId, logId)
      if (!deleted) return { success: false as const, status: 404, error: 'Log not found' }

      return {
        success: true as const,
        source: 'file' as const,
        warning: 'Database unavailable - deleted from local fallback storage.',
        cycle: { hasCycleData: false, lastPeriodDate: null, cycleLength: 28, prediction: null },
      }
    }
    throw dbError
  }
}
