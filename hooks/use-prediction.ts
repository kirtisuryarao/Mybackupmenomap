'use client'

import { useState, useEffect } from 'react'

import { authenticatedFetch } from '@/lib/auth-client'
import { HybridPredictionResponse } from '@/lib/hybrid-prediction'

export interface DashboardSymptomInsight {
  key: 'fatigue' | 'hot_flashes' | 'mood_swings'
  title: string
  message: string
  confidence: 'watch' | 'likely'
}

export interface DashboardPredictionResponse extends Partial<HybridPredictionResponse> {
  mode: 'cycle' | 'menopause'
  menopauseModeActive: boolean
  menopauseStage: 'regular' | 'irregular' | 'perimenopause' | 'menopause'
  symptomInsights: DashboardSymptomInsight[]
  alertMessage: string | null
  symptomSummary: {
    averageSleepHours: number | null
    recurringSymptoms: string[]
    moodSignals: string[]
  }
}

interface UsePredictionReturn {
  prediction: DashboardPredictionResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function usePrediction(): UsePredictionReturn {
  const [prediction, setPrediction] = useState<DashboardPredictionResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPrediction = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await authenticatedFetch('/api/predict')
      if (!response.ok) {
        const text = await response.text()
        throw new Error(`Prediction fetch failed: ${response.status} ${response.statusText} - ${text}`)
      }

      const data = await response.json()
      console.error('[usePrediction] Loaded prediction:', data)
      setPrediction(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prediction')
      setPrediction(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPrediction()

    const handleLogsUpdated = () => {
      console.error('[usePrediction] menomap:logs-updated event received, refreshing prediction')
      fetchPrediction()
    }

    window.addEventListener('menomap:logs-updated', handleLogsUpdated)
    return () => {
      window.removeEventListener('menomap:logs-updated', handleLogsUpdated)
    }
  }, [])

  return {
    prediction,
    isLoading,
    error,
    refetch: fetchPrediction,
  }
}