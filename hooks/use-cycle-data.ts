'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

import { authenticatedFetch } from '@/lib/auth-client'
import { CycleData, getDayInfo, formatDate, parseDate, DayInfo } from '@/lib/cycle-calculations'
import { useCycleStore } from '@/lib/cycle-store'

const DEFAULT_CYCLE_LENGTH = 28

interface UseCycleDataReturn {
  cycleData: CycleData | null
  todayInfo: DayInfo | null
  isLoading: boolean
  refreshCycleData: () => Promise<void>
  setCycleData: (data: CycleData) => void
  updateCycleData: (lastPeriodDate: string, cycleLength: number) => void
}

export function useCycleData(): UseCycleDataReturn {
  const store = useCycleStore()
  const [todayInfo, setTodayInfo] = useState<DayInfo | null>(null)
  const initRef = useRef(false)

  // Convert store data to CycleData format
  const storeCycleData = store.cycleData;
  const cycleData: CycleData | null = useMemo(() => {
    return storeCycleData
      ? {
          lastPeriodDate: storeCycleData.lastPeriodDate || formatDate(new Date()),
          cycleLength: storeCycleData.cycleLength || DEFAULT_CYCLE_LENGTH,
          cycleStarts: storeCycleData.cycleStarts || [],
        }
      : null
  }, [storeCycleData])

  // Initialize store on client mount
  useEffect(() => {
    // Only initialize once
    if (initRef.current) return
    initRef.current = true

    const initStore = async () => {
      try {
        if (!store.cycleData && !store.isLoading) {
          console.error('[useCycleData] Initializing store with fresh data')
          await store.refreshCycle()
        }
      } catch (error) {
        console.error('[useCycleData] Failed to initialize store:', error)
      }
    }

    initStore()
  }, [store])

  // Calculate today's info whenever cycleData changes
  useEffect(() => {
    if (cycleData && cycleData.lastPeriodDate) {
      try {
        const lastPeriod = parseDate(cycleData.lastPeriodDate)
        if (lastPeriod) {
          const info = getDayInfo(new Date(), lastPeriod, cycleData.cycleLength)
          setTodayInfo(info)
        } else {
          setTodayInfo(null)
        }
      } catch (error) {
        console.error('[useCycleData] Error calculating day info:', error)
        setTodayInfo(null)
      }
    } else {
      setTodayInfo(null)
    }
  }, [cycleData])

  // Listen for window events to refresh
  useEffect(() => {
    const onCycleChanged = () => {
      console.error('[useCycleData] menomap:logs-updated event received, refreshing...')
      store.refreshCycle()
    }

    window.addEventListener('menomap:logs-updated', onCycleChanged)
    return () => {
      window.removeEventListener('menomap:logs-updated', onCycleChanged)
    }
  }, [store])

  const setCycleData = useCallback(
    async (data: CycleData) => {
      try {
        console.error('[useCycleData] Setting cycle data:', data)
        await authenticatedFetch('/api/cycle', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lastPeriodDate: data.lastPeriodDate,
            cycleLength: data.cycleLength,
          }),
        })
        console.error('[useCycleData] Cycle set successful, refreshing store...')
        // Refresh from store after successful update
        await store.refreshCycle()
        // Dispatch event to trigger all other listeners
        console.error('[useCycleData] Dispatching menomap:logs-updated event')
        window.dispatchEvent(new CustomEvent('menomap:logs-updated'))
      } catch (error) {
        console.error('[useCycleData] Failed to save cycle data:', error)
        store.setError('Failed to save cycle data')
      }
    },
    [store]
  )

  const updateCycleData = useCallback(
    async (lastPeriodDate: string, cycleLength: number) => {
      try {
        console.error('[useCycleData] Updating cycle data:', { lastPeriodDate, cycleLength })
        await authenticatedFetch('/api/cycle', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lastPeriodDate,
            cycleLength,
          }),
        })
        console.error('[useCycleData] Cycle update successful, refreshing store...')
        // Refresh from store after successful update
        await store.refreshCycle()
        // Dispatch event to trigger all other listeners (usePrediction, useLogs, etc.)
        console.error('[useCycleData] Dispatching menomap:logs-updated event')
        window.dispatchEvent(new CustomEvent('menomap:logs-updated'))
      } catch (error) {
        console.error('[useCycleData] Failed to update cycle data:', error)
        store.setError('Failed to update cycle data')
      }
    },
    [store]
  )

  return {
    cycleData,
    todayInfo,
    isLoading: store.isLoading,
    refreshCycleData: store.refreshCycle,
    setCycleData,
    updateCycleData,
  }
}
