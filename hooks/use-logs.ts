'use client'

import { useState, useEffect, useCallback } from 'react'
import { authenticatedFetch } from '@/lib/auth-client'

export interface DailyLog {
  id?: string
  date: string
  flow: string | null
  spotting: string | null
  mood: string[]
  symptoms: string[]
  temperature: number | null
  sleepQuality: string | null
  notes: string | null
}

interface UseLogsReturn {
  logs: DailyLog[]
  isLoading: boolean
  getLogForDate: (date: string) => DailyLog | undefined
  saveLog: (log: DailyLog) => Promise<void>
  refreshLogs: () => Promise<void>
}

export function useLogs(): UseLogsReturn {
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refreshLogs = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/api/logs?limit=365')
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Failed to load logs:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshLogs()
  }, [refreshLogs])

  const getLogForDate = useCallback((date: string) => {
    return logs.find(l => l.date === date)
  }, [logs])

  const saveLog = useCallback(async (log: DailyLog) => {
    try {
      const response = await authenticatedFetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log),
      })

      if (!response.ok) {
        throw new Error('Failed to save log')
      }

      // Refresh logs after saving
      await refreshLogs()
    } catch (error) {
      console.error('Failed to save log:', error)
      throw error
    }
  }, [refreshLogs])

  return { logs, isLoading, getLogForDate, saveLog, refreshLogs }
}
