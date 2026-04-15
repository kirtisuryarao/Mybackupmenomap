'use client'

import { useState, useCallback } from 'react'
import { authenticatedFetch } from '@/lib/auth-client'

export interface DailyLog {
  date: string
  flow?: string | null
  mood: string[]
  symptoms: string[]
  notes?: string | null
}

interface UseDailyLogsReturn {
  logs: DailyLog[]
  isLoading: boolean
  error: string | null
  addLog: (log: DailyLog) => Promise<void>
  refreshLogs: () => Promise<void>
}

export function useDailyLogs(): UseDailyLogsReturn {
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshLogs = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await authenticatedFetch('/api/logs')
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
      } else {
        setError('Failed to load logs')
      }
    } catch (err) {
      console.error('Error fetching logs:', err)
      setError('An error occurred while fetching logs')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const addLog = useCallback(
    async (log: DailyLog) => {
      try {
        const response = await authenticatedFetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(log),
        })

        if (response.ok) {
          await refreshLogs()
        } else {
          const data = await response.json()
          setError(data.error || 'Failed to save log')
        }
      } catch (err) {
        console.error('Error adding log:', err)
        setError('An error occurred while saving the log')
      }
    },
    [refreshLogs]
  )

  return { logs, isLoading, error, addLog, refreshLogs }
}
