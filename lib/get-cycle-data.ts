/**
 * Shared utility to get cycle data from fresh sources
 * Used by Calendar, Chat, and Partner APIs to ensure consistency
 */

import { recomputeCycleForUser } from '@/lib/cycle-recalculation'
import { prisma } from '@/lib/prisma'

export interface CycleDataResponse {
  hasCycleData: boolean
  lastPeriodDate: string | null
  cycleLength: number
  cycleStarts: string[]
  prediction: any | null
  source: 'computed_from_logs' | 'user_provided' | 'default'
}

/**
 * Get cycle data for a user - ALWAYS computes from logs first, then falls back
 * This is the SINGLE SOURCE OF TRUTH for all cycle-related calculations
 */
export async function getCycleData(userId: string): Promise<CycleDataResponse> {
  try {
    console.log(`[CycleData] Getting cycle data for user ${userId}`)
    
    // First priority: Compute from actual flow logs
    let computed
    try {
      console.log(`[CycleData] Attempting to compute cycle from logs for user ${userId}`)
      computed = await recomputeCycleForUser(userId, { persist: false })
      console.log(`[CycleData] Computation complete:`, {
        hasCycleData: computed.hasCycleData,
        hasAnyLogs: computed.hasAnyLogs,
        cycleStartsCount: computed.cycleStarts.length,
      })
    } catch (computeError) {
      console.error(`[CycleData] Error computing cycle from logs:`, computeError)
      throw computeError
    }

    if (computed.hasCycleData) {
      console.log(`[CycleData] User ${userId}: Using computed data from logs`, {
        lastPeriodDate: computed.lastPeriodDate,
        cycleLength: computed.cycleLength,
        source: 'computed',
      })

      return {
        hasCycleData: true,
        lastPeriodDate: computed.lastPeriodDate,
        cycleLength: computed.cycleLength,
        cycleStarts: computed.cycleStarts,
        prediction: computed.prediction,
        source: 'computed_from_logs',
      }
    }

    // Fallback: Use user-provided initial data from signup
    console.log(`[CycleData] No computed data, checking for user-provided cycle entry`)
    let cycleEntry
    try {
      cycleEntry = await prisma.cycleEntry.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { lastPeriodDate: true, cycleLength: true },
      })
    } catch (dbError) {
      console.error(`[CycleData] Database error fetching cycleEntry:`, dbError)
      throw dbError
    }

    if (cycleEntry) {
      const lastPeriodDate = formatToIso(cycleEntry.lastPeriodDate)
      console.log(`[CycleData] User ${userId}: Using user-provided cycle entry`, {
        lastPeriodDate,
        cycleLength: cycleEntry.cycleLength,
        source: 'user_provided',
      })

      return {
        hasCycleData: true,
        lastPeriodDate,
        cycleLength: cycleEntry.cycleLength,
        cycleStarts: [lastPeriodDate],
        prediction: null,
        source: 'user_provided',
      }
    }

    // No data available - return defaults
    console.log(`[CycleData] User ${userId}: No cycle data, using defaults`)
    return {
      hasCycleData: false,
      lastPeriodDate: null,
      cycleLength: 28, // Standard default
      cycleStarts: [],
      prediction: null,
      source: 'default',
    }
  } catch (error) {
    console.error(`[CycleData] CRITICAL ERROR getting cycle data for user ${userId}:`, error)
    // Re-throw with more context
    throw new Error(
      `getCycleData failed for user ${userId}: ${
        error instanceof Error ? error.message : JSON.stringify(error)
      }`
    )
  }
}

/**
 * Helper: Format date to ISO string (YYYY-MM-DD)
 */
function formatToIso(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
