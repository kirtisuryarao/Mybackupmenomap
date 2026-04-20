import bcrypt from 'bcryptjs'

export type SensitiveDataType = 'cycle' | 'symptoms' | 'notes'

export interface PrivacyPreferences {
  hideSensitiveData: boolean
  blurCycleData: boolean
  blurSymptoms: boolean
  blurNotes: boolean
  appLockEnabled: boolean
  pinHash: string | null
  autoLockMinutes: number
  largeText: boolean
  highContrast: boolean
  periodReminder: boolean
  ovulationReminder: boolean
}

const PRIVACY_STORAGE_KEY = 'menomap:privacy-preferences'
const LOCK_STATE_API = '/api/privacy/lock'
const PIN_SALT_ROUNDS = 12

let inMemoryLockState = false
let lastActivityAt = 0

const defaultPreferences: PrivacyPreferences = {
  hideSensitiveData: false,
  blurCycleData: false,
  blurSymptoms: false,
  blurNotes: false,
  appLockEnabled: false,
  pinHash: null,
  autoLockMinutes: 5,
  largeText: false,
  highContrast: false,
  periodReminder: true,
  ovulationReminder: true,
}

function isBrowser() {
  return typeof window !== 'undefined'
}

function persistLockState(locked: boolean) {
  if (!isBrowser() || typeof fetch !== 'function') return

  const request = fetch(LOCK_STATE_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ locked }),
  })

  if (request && typeof (request as Promise<unknown>).catch === 'function') {
    void (request as Promise<unknown>).catch(() => {})
  }
}

function hashPin(pin: string): string {
  return bcrypt.hashSync(pin, PIN_SALT_ROUNDS)
}

function normalizePreferences(preferences: Partial<PrivacyPreferences>): PrivacyPreferences {
  return {
    ...defaultPreferences,
    ...preferences,
    autoLockMinutes: Math.max(1, Math.min(60, Number(preferences.autoLockMinutes ?? defaultPreferences.autoLockMinutes) || defaultPreferences.autoLockMinutes)),
  }
}

export function getPrivacyPreferences(): PrivacyPreferences {
  if (!isBrowser()) {
    return defaultPreferences
  }

  try {
    const raw = window.localStorage.getItem(PRIVACY_STORAGE_KEY)
    if (!raw) {
      return defaultPreferences
    }

    const parsed = JSON.parse(raw) as Partial<PrivacyPreferences>
    return normalizePreferences(parsed)
  } catch {
    return defaultPreferences
  }
}

export function savePrivacyPreferences(preferences: PrivacyPreferences) {
  if (!isBrowser()) return
  window.localStorage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(normalizePreferences(preferences)))
}

export function updatePrivacyPreferences(patch: Partial<PrivacyPreferences>): PrivacyPreferences {
  const next = normalizePreferences({
    ...getPrivacyPreferences(),
    ...patch,
  })
  savePrivacyPreferences(next)
  return next
}

export function setAppPin(pin: string): PrivacyPreferences {
  const normalized = pin.trim()
  if (!/^\d{4,6}$/.test(normalized)) {
    throw new Error('Use a 4 to 6 digit PIN')
  }

  const next = updatePrivacyPreferences({
    pinHash: hashPin(normalized),
    appLockEnabled: true,
  })
  unlockApp()
  return next
}

export function clearAppPin(): PrivacyPreferences {
  const next = updatePrivacyPreferences({
    pinHash: null,
    appLockEnabled: false,
  })
  unlockApp()
  return next
}

export function verifyPin(pin: string): boolean {
  const { pinHash } = getPrivacyPreferences()
  if (!pinHash) return false
  return bcrypt.compareSync(pin.trim(), pinHash)
}

export function recordAppActivity() {
  if (!isBrowser()) return
  lastActivityAt = Date.now()
}

export function unlockApp() {
  if (!isBrowser()) return
  inMemoryLockState = false
  lastActivityAt = Date.now()
  persistLockState(false)
}

export function lockApp() {
  if (!isBrowser()) return
  inMemoryLockState = true
  lastActivityAt = 0
  persistLockState(true)
}

export function isAppLocked(): boolean {
  if (!isBrowser()) return false

  const prefs = getPrivacyPreferences()
  if (!prefs.appLockEnabled || !prefs.pinHash) {
    return false
  }

  if (!inMemoryLockState && lastActivityAt > 0) {
    const elapsedMs = Date.now() - lastActivityAt
    const timeoutMs = prefs.autoLockMinutes * 60_000
    if (elapsedMs >= timeoutMs) {
      lockApp()
      return true
    }
  }

  return inMemoryLockState
}

export function shouldBlurType(type: SensitiveDataType, prefs: PrivacyPreferences): boolean {
  if (prefs.hideSensitiveData) {
    return true
  }

  if (type === 'cycle') return prefs.blurCycleData
  if (type === 'symptoms') return prefs.blurSymptoms
  return prefs.blurNotes
}

export function getHiddenValueLabel(type: SensitiveDataType): string {
  if (type === 'cycle') return 'Cycle data hidden'
  if (type === 'symptoms') return 'Symptoms hidden'
  return 'Notes hidden'
}
