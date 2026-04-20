import {
  getPrivacyPreferences,
  updatePrivacyPreferences,
  setAppPin,
  clearAppPin,
  verifyPin,
  recordAppActivity,
  unlockApp,
  lockApp,
  isAppLocked,
  shouldBlurType,
  getHiddenValueLabel,
} from '@/lib/security/privacyService'

describe('privacyService', () => {
  const mockFetch = jest.fn()

  const createStorageMock = () => {
    const store = new Map<string, string>()

    return {
      getItem: jest.fn((key: string) => store.get(key) ?? null),
      setItem: jest.fn((key: string, value: string) => {
        store.set(key, value)
      }),
      removeItem: jest.fn((key: string) => {
        store.delete(key)
      }),
      clear: jest.fn(() => {
        store.clear()
      }),
    }
  }

  let localStorageMock: ReturnType<typeof createStorageMock>
  let sessionStorageMock: ReturnType<typeof createStorageMock>

  beforeEach(() => {
    jest.useFakeTimers()
    localStorageMock = createStorageMock()
    sessionStorageMock = createStorageMock()

    Object.assign(globalThis, {
      window: globalThis,
      localStorage: localStorageMock,
      sessionStorage: sessionStorageMock,
      fetch: mockFetch,
    })
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
    jest.restoreAllMocks()
    mockFetch.mockReset()
    delete (globalThis as { window?: unknown }).window
    delete (globalThis as { localStorage?: unknown }).localStorage
    delete (globalThis as { sessionStorage?: unknown }).sessionStorage
    delete (globalThis as { fetch?: unknown }).fetch
  })

  describe('getPrivacyPreferences', () => {
    it('should return default preferences when nothing is stored', () => {
      const prefs = getPrivacyPreferences()

      expect(prefs.hideSensitiveData).toBe(false)
      expect(prefs.appLockEnabled).toBe(false)
      expect(prefs.pinHash).toBe(null)
      expect(prefs.autoLockMinutes).toBe(5)
    })

    it('should load stored preferences from localStorage', () => {
      const stored = {
        hideSensitiveData: true,
        blurCycleData: true,
        autoLockMinutes: 10,
      }
      localStorage.setItem('menomap:privacy-preferences', JSON.stringify(stored))

      const prefs = getPrivacyPreferences()

      expect(prefs.hideSensitiveData).toBe(true)
      expect(prefs.blurCycleData).toBe(true)
      expect(prefs.autoLockMinutes).toBe(10)
    })

    it('should normalize invalid autoLockMinutes to 1-60 range', () => {
      localStorage.setItem('menomap:privacy-preferences', JSON.stringify({ autoLockMinutes: 100 }))

      const prefs = getPrivacyPreferences()

      expect(prefs.autoLockMinutes).toBe(60)
    })
  })

  describe('updatePrivacyPreferences', () => {
    it('should merge partial updates with existing preferences', () => {
      const prefs1 = updatePrivacyPreferences({ hideSensitiveData: true })
      expect(prefs1.hideSensitiveData).toBe(true)
      expect(prefs1.appLockEnabled).toBe(false)

      const prefs2 = updatePrivacyPreferences({ appLockEnabled: true })
      expect(prefs2.hideSensitiveData).toBe(true)
      expect(prefs2.appLockEnabled).toBe(true)
    })

    it('should persist changes to localStorage', () => {
      updatePrivacyPreferences({ blurSymptoms: true })
      const stored = JSON.parse(localStorageMock.getItem('menomap:privacy-preferences') || '{}')
      expect(stored.blurSymptoms).toBe(true)
    })
  })

  describe('setAppPin and verifyPin', () => {
    it('should set a PIN and enable app lock', () => {
      const result = setAppPin('1234')

      expect(result.appLockEnabled).toBe(true)
      expect(result.pinHash).not.toBeNull()
      expect(result.pinHash).not.toBe('1234')
    })

    it('should reject PIN with fewer than 4 digits', () => {
      expect(() => setAppPin('123')).toThrow()
    })

    it('should reject PIN with more than 6 digits', () => {
      expect(() => setAppPin('1234567')).toThrow()
    })

    it('should verify correct PIN', () => {
      setAppPin('5678')
      expect(verifyPin('5678')).toBe(true)
    })

    it('should reject incorrect PIN', () => {
      setAppPin('5678')
      expect(verifyPin('1234')).toBe(false)
    })

    it('should return false when no PIN is set', () => {
      expect(verifyPin('1234')).toBe(false)
    })
  })

  describe('clearAppPin', () => {
    it('should disable app lock and clear PIN', () => {
      setAppPin('1234')
      const result = clearAppPin()

      expect(result.appLockEnabled).toBe(false)
      expect(result.pinHash).toBeNull()
    })
  })

  describe('unlockApp and lockApp', () => {
    it('should unlock the app by setting session storage', () => {
      unlockApp()
      const isLocked = isAppLocked()

      expect(isLocked).toBe(false)
    })

    it('should lock the app by removing session storage', () => {
      setAppPin('1234')
      unlockApp()
      lockApp()

      expect(isAppLocked()).toBe(true)
    })

    it('should persist lock state through the privacy lock endpoint', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })
      lockApp()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/privacy/lock',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  describe('isAppLocked', () => {
    it('should return false when app lock is disabled', () => {
      expect(isAppLocked()).toBe(false)
    })

    it('should return true when app lock is enabled and not unlocked', () => {
      setAppPin('1234')
      lockApp()

      expect(isAppLocked()).toBe(true)
    })

    it('should return false when app is unlocked', () => {
      setAppPin('1234')
      unlockApp()

      expect(isAppLocked()).toBe(false)
    })

    it('should return true when unlock timeout expires', () => {
      setAppPin('1234')
      updatePrivacyPreferences({ autoLockMinutes: 0.0001 })
      unlockApp()
      recordAppActivity()

      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 61_000)

      expect(isAppLocked()).toBe(true)
    })
  })

  describe('shouldBlurType', () => {
    it('should blur when hideSensitiveData is true', () => {
      const prefs = { ...getPrivacyPreferences() }
      prefs.hideSensitiveData = true

      expect(shouldBlurType('cycle', prefs)).toBe(true)
      expect(shouldBlurType('symptoms', prefs)).toBe(true)
      expect(shouldBlurType('notes', prefs)).toBe(true)
    })

    it('should blur cycle data when blurCycleData is true', () => {
      const prefs = { ...getPrivacyPreferences() }
      prefs.blurCycleData = true

      expect(shouldBlurType('cycle', prefs)).toBe(true)
      expect(shouldBlurType('symptoms', prefs)).toBe(false)
    })

    it('should blur symptoms when blurSymptoms is true', () => {
      const prefs = { ...getPrivacyPreferences() }
      prefs.blurSymptoms = true

      expect(shouldBlurType('symptoms', prefs)).toBe(true)
      expect(shouldBlurType('cycle', prefs)).toBe(false)
    })

    it('should blur notes when blurNotes is true', () => {
      const prefs = { ...getPrivacyPreferences() }
      prefs.blurNotes = true

      expect(shouldBlurType('notes', prefs)).toBe(true)
      expect(shouldBlurType('cycle', prefs)).toBe(false)
    })
  })

  describe('getHiddenValueLabel', () => {
    it('should return correct label for cycle data', () => {
      expect(getHiddenValueLabel('cycle')).toBe('Cycle data hidden')
    })

    it('should return correct label for symptoms', () => {
      expect(getHiddenValueLabel('symptoms')).toBe('Symptoms hidden')
    })

    it('should return correct label for notes', () => {
      expect(getHiddenValueLabel('notes')).toBe('Notes hidden')
    })
  })
})
