import { randomUUID } from 'crypto'
import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'

interface FilePartner {
  id: string
  name: string
  phone: string
  addedDate: string
}

interface FileNotificationSettings {
  periodReminder: boolean
  phaseChange: boolean
  pushNotifications: boolean
  emailNotifications: boolean
}

interface FilePrivacySettings {
  profilePublic: boolean
  shareWithPartner: boolean
  allowHealthInsight: boolean
}

interface FileUser {
  id: string
  email: string
  passwordHash: string
  name: string
  age: number | null
  cycleLength: number
  periodLength: number
  periodDuration: number
  menopauseStage: 'regular' | 'irregular' | 'perimenopause' | 'menopause'
  createdAt: string
  updatedAt: string
  lastPeriodDate: string
  partners: FilePartner[]
  notificationSettings: FileNotificationSettings
  privacySettings: FilePrivacySettings
}

interface FileRefreshToken {
  id: string
  userId: string
  token: string
  expiresAt: string
  createdAt: string
}

interface FileAuthStore {
  users: FileUser[]
  refreshTokens: FileRefreshToken[]
}

const STORE_DIR = path.join(process.cwd(), '.data')
const STORE_FILE = path.join(STORE_DIR, 'auth-store.json')

async function readStore(): Promise<FileAuthStore> {
  try {
    const content = await readFile(STORE_FILE, 'utf8')
    const parsed = JSON.parse(content) as Partial<FileAuthStore>

    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      refreshTokens: Array.isArray(parsed.refreshTokens) ? parsed.refreshTokens : [],
    }
  } catch {
    return { users: [], refreshTokens: [] }
  }
}

async function writeStore(store: FileAuthStore): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true })
  await writeFile(STORE_FILE, JSON.stringify(store, null, 2), 'utf8')
}

export async function findFileUserByEmail(email: string): Promise<FileUser | null> {
  const store = await readStore()
  return store.users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null
}

export async function findFileUserById(userId: string): Promise<FileUser | null> {
  const store = await readStore()
  return store.users.find((user) => user.id === userId) ?? null
}

export async function createFileUser(input: {
  email: string
  passwordHash: string
  name: string
  age: number | null
  cycleLength: number
  periodLength: number
  menopauseStage: 'regular' | 'irregular' | 'perimenopause' | 'menopause'
  lastPeriodDate?: string
  partnerPhone?: string
}): Promise<FileUser> {
  const now = new Date().toISOString()
  const user: FileUser = {
    id: randomUUID(),
    email: input.email,
    passwordHash: input.passwordHash,
    name: input.name,
    age: input.age,
    cycleLength: input.cycleLength,
    periodLength: input.periodLength,
    periodDuration: 5,
    menopauseStage: input.menopauseStage,
    createdAt: now,
    updatedAt: now,
    lastPeriodDate: input.lastPeriodDate || '',
    partners: input.partnerPhone
      ? [
          {
            id: randomUUID(),
            name: 'Partner',
            phone: input.partnerPhone,
            addedDate: now,
          },
        ]
      : [],
    notificationSettings: {
      periodReminder: true,
      phaseChange: true,
      pushNotifications: false,
      emailNotifications: false,
    },
    privacySettings: {
      profilePublic: false,
      shareWithPartner: false,
      allowHealthInsight: true,
    },
  }

  const store = await readStore()
  store.users.push(user)
  await writeStore(store)

  return user
}

export async function createFileRefreshToken(input: {
  userId: string
  token: string
  expiresAt: Date
}): Promise<void> {
  const store = await readStore()
  store.refreshTokens.push({
    id: randomUUID(),
    userId: input.userId,
    token: input.token,
    expiresAt: input.expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
  })
  await writeStore(store)
}

export async function cleanupExpiredFileRefreshTokens(): Promise<void> {
  const now = Date.now()
  const store = await readStore()
  store.refreshTokens = store.refreshTokens.filter((token) => {
    return new Date(token.expiresAt).getTime() >= now
  })
  await writeStore(store)
}

export async function findFileRefreshToken(tokenValue: string): Promise<(FileRefreshToken & { user: FileUser | null }) | null> {
  const store = await readStore()
  const token = store.refreshTokens.find((item) => item.token === tokenValue)

  if (!token) {
    return null
  }

  const user = store.users.find((item) => item.id === token.userId) ?? null

  return {
    ...token,
    user,
  }
}

export async function deleteFileRefreshTokenById(id: string): Promise<void> {
  const store = await readStore()
  store.refreshTokens = store.refreshTokens.filter((token) => token.id !== id)
  await writeStore(store)
}

export async function deleteFileRefreshTokensByUser(userId: string, tokenValue?: string): Promise<void> {
  const store = await readStore()

  store.refreshTokens = store.refreshTokens.filter((token) => {
    if (token.userId !== userId) {
      return true
    }

    if (!tokenValue) {
      return false
    }

    return token.token !== tokenValue
  })

  await writeStore(store)
}

export function toApiUser(user: FileUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    age: user.age,
    cycleLength: user.cycleLength,
    periodLength: user.periodLength,
    periodDuration: user.periodDuration,
    menopauseStage: user.menopauseStage,
    createdAt: user.createdAt,
    partners: user.partners,
    notificationSettings: user.notificationSettings,
    privacySettings: user.privacySettings,
  }
}
