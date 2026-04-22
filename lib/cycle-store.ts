/**
 * Centralized cycle data store using Zustand
 * Single source of truth for all cycle-related state across the app
 */

import { create } from 'zustand'

import { authenticatedFetch } from '@/lib/auth-client'

export interface CycleStoreState {
  // State
  cycleData: {
    hasCycleData: boolean
    lastPeriodDate: string | null
    cycleLength: number
    cycleStarts: string[]
    prediction: any | null
    source: 'computed_from_logs' | 'user_provided' | 'default'
  } | null
  isLoading: boolean
  error: string | null
  lastFetchedAt: number | null

  // Actions
  setCycleData: (data: CycleStoreState['cycleData']) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  refreshCycle: () => Promise<void>
  clearStore: () => void
}

// Fetch cycle data from API with authentication
async function fetchCycleData(): Promise<CycleStoreState['cycleData']> {
  try {
    const response = await authenticatedFetch('/api/cycle')
    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Failed to fetch cycle data: ${response.status} ${response.statusText} - ${errorBody}`)
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error('[CycleStore] Error fetching cycle data:', error)
    throw error
  }
}

export const useCycleStore = create<CycleStoreState>((set, get) => ({
  cycleData: null,
  isLoading: false,
  error: null,
  lastFetchedAt: null,

  setCycleData: (data) => {
    set({
      cycleData: data,
      lastFetchedAt: Date.now(),
      error: null,
    })
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('menomap:cycle-updated', { detail: data }))
  },

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => {
    set({ error })
    if (error) console.error('[CycleStore] Error:', error)
  },

  refreshCycle: async () => {
    const state = get()
    // Prevent multiple simultaneous refreshes
    if (state.isLoading) {
      return
    }

    set({ isLoading: true, error: null })
    try {
      const data = await fetchCycleData()
      set({
        cycleData: data,
        isLoading: false,
        lastFetchedAt: Date.now(),
        error: null,
      })
      // Dispatch event
      window.dispatchEvent(new CustomEvent('menomap:cycle-updated', { detail: data }))
    } catch (error) {
      console.error('[CycleStore] Failed to refresh cycle:', error)
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to refresh cycle data',
      })
    }
  },

  clearStore: () => {
    set({
      cycleData: null,
      isLoading: false,
      error: null,
      lastFetchedAt: null,
    })
  },
}))
