'use client'

import { useState, useEffect, useCallback } from 'react'
import { CycleData, getDayInfo, formatDate, parseDate, DayInfo } from '@/lib/cycle-calculations'

const CYCLE_STORAGE_KEY = 'cycle_companion_data'
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

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(CYCLE_STORAGE_KEY)
    if (stored) {
      try {
        const data = JSON.parse(stored)
        setCycleDataState(data)
      } catch (e) {
        console.error('Failed to parse cycle data:', e)
        // Initialize with a default cycle (28 days ago as last period)
        const defaultLastPeriod = new Date()
        defaultLastPeriod.setDate(defaultLastPeriod.getDate() - 14)
        const defaultData: CycleData = {
          lastPeriodDate: formatDate(defaultLastPeriod),
          cycleLength: DEFAULT_CYCLE_LENGTH,
        }
        setCycleDataState(defaultData)
        localStorage.setItem(CYCLE_STORAGE_KEY, JSON.stringify(defaultData))
      }
    } else {
      // Initialize with default cycle
      const defaultLastPeriod = new Date()
      defaultLastPeriod.setDate(defaultLastPeriod.getDate() - 14)
      const defaultData: CycleData = {
        lastPeriodDate: formatDate(defaultLastPeriod),
        cycleLength: DEFAULT_CYCLE_LENGTH,
      }
      setCycleDataState(defaultData)
      localStorage.setItem(CYCLE_STORAGE_KEY, JSON.stringify(defaultData))
    }
    setIsLoading(false)
  }, [])

  const setCycleData = useCallback((data: CycleData) => {
    setCycleDataState(data)
    localStorage.setItem(CYCLE_STORAGE_KEY, JSON.stringify(data))
  }, [])

  const updateCycleData = useCallback(
    (lastPeriodDate: string, cycleLength: number) => {
      const newData: CycleData = {
        lastPeriodDate,
        cycleLength,
      }
      setCycleData(newData)
    },
    [setCycleData]
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
