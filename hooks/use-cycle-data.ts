'use client'

import { useState, useEffect, useCallback } from 'react'
import { CycleData, getDayInfo, formatDate, parseDate, DayInfo } from '@/lib/cycle-calculations'
import { authenticatedFetch } from '@/lib/auth-client'

const DEFAULT_CYCLE_LENGTH = 28

interface UseCycleDataReturn {
  cycleData: CycleData | null
  todayInfo: DayInfo | null
  isLoading: boolean
  setCycleData: (data: CycleData) => void
  updateCycleData: (lastPeriodDate: string, cycleLength: number) => void
}

export function useCycleData(): UseCycleDataReturn {
  const [cycleData, setCycleDataState] = useState<CycleData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load from API on mount
  useEffect(() => {
    async function loadCycleData() {
      try {
        const response = await authenticatedFetch('/api/cycle')
        if (response.ok) {
          const data = await response.json()
          setCycleDataState({
            lastPeriodDate: data.lastPeriodDate,
            cycleLength: data.cycleLength,
          })
        } else {
          // Fallback to default if not authenticated or error
          const defaultLastPeriod = new Date()
          defaultLastPeriod.setDate(defaultLastPeriod.getDate() - 14)
          setCycleDataState({
            lastPeriodDate: formatDate(defaultLastPeriod),
            cycleLength: DEFAULT_CYCLE_LENGTH,
          })
        }
      } catch (error) {
        console.error('Failed to load cycle data:', error)
        // Fallback to default
        const defaultLastPeriod = new Date()
        defaultLastPeriod.setDate(defaultLastPeriod.getDate() - 14)
        setCycleDataState({
          lastPeriodDate: formatDate(defaultLastPeriod),
          cycleLength: DEFAULT_CYCLE_LENGTH,
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadCycleData()
  }, [])

  const setCycleData = useCallback(async (data: CycleData) => {
    setCycleDataState(data)
    try {
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
    } catch (error) {
      console.error('Failed to save cycle data:', error)
    }
  }, [])

  const updateCycleData = useCallback(
    async (lastPeriodDate: string, cycleLength: number) => {
      const newData: CycleData = {
        lastPeriodDate,
        cycleLength,
      }
      setCycleDataState(newData)
      try {
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
      } catch (error) {
        console.error('Failed to update cycle data:', error)
        throw error
      }
    },
    []
  )

  // Calculate today's info
  const todayInfo = cycleData
    ? getDayInfo(new Date(), parseDate(cycleData.lastPeriodDate), cycleData.cycleLength)
    : null

  return {
    cycleData,
    todayInfo,
    isLoading,
    setCycleData,
    updateCycleData,
  }
}
