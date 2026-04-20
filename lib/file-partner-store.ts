import { randomUUID } from 'crypto'
import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilePartnerRecord {
  id: string
  userId: string
  name: string
  email: string
  passwordHash: string
  createdAt: string
  updatedAt: string
}

interface FilePartnerRefreshToken {
  id: string
  partnerId: string
  tokenHash: string
  expiresAt: string
  revoked: boolean
  createdAt: string
}

interface FilePartnerStore {
  partners: FilePartnerRecord[]
  refreshTokens: FilePartnerRefreshToken[]
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

const STORE_DIR = path.join(process.cwd(), '.data')
const PARTNER_STORE_FILE = path.join(STORE_DIR, 'partner-store.json')

async function readStore(): Promise<FilePartnerStore> {
  try {
    const content = await readFile(PARTNER_STORE_FILE, 'utf8')
    const parsed = JSON.parse(content) as Partial<FilePartnerStore>
    return {
      partners: Array.isArray(parsed.partners) ? parsed.partners : [],
      refreshTokens: Array.isArray(parsed.refreshTokens) ? parsed.refreshTokens : [],
    }
  } catch {
    return { partners: [], refreshTokens: [] }
  }
}

async function writeStore(store: FilePartnerStore): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true })
  await writeFile(PARTNER_STORE_FILE, JSON.stringify(store, null, 2), 'utf8')
}

// ---------------------------------------------------------------------------
// Partner CRUD
// ---------------------------------------------------------------------------

export async function findFilePartnerByEmail(
  email: string
): Promise<FilePartnerRecord | null> {
  const store = await readStore()
  return (
    store.partners.find((p) => p.email.toLowerCase() === email.toLowerCase()) ?? null
  )
}

export async function findFilePartnerById(
  partnerId: string
): Promise<FilePartnerRecord | null> {
  const store = await readStore()
  return store.partners.find((p) => p.id === partnerId) ?? null
}

export async function findFilePartnersByUserId(
  userId: string
): Promise<FilePartnerRecord[]> {
  const store = await readStore()
  return store.partners.filter((p) => p.userId === userId)
}

export async function createFilePartner(input: {
  userId: string
  name: string
  email: string
  passwordHash: string
}): Promise<FilePartnerRecord> {
  const store = await readStore()

  // Enforce uniqueness
  const exists = store.partners.find(
    (p) => p.email.toLowerCase() === input.email.toLowerCase()
  )
  if (exists) {
    throw new Error('This email is already registered as a partner')
  }

  const now = new Date().toISOString()
  const record: FilePartnerRecord = {
    id: randomUUID(),
    userId: input.userId,
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash: input.passwordHash,
    createdAt: now,
    updatedAt: now,
  }

  store.partners.push(record)
  await writeStore(store)
  return record
}

export async function deleteFilePartner(partnerId: string): Promise<void> {
  const store = await readStore()
  store.partners = store.partners.filter((p) => p.id !== partnerId)
  // Also remove refresh tokens for this partner
  store.refreshTokens = store.refreshTokens.filter((t) => t.partnerId !== partnerId)
  await writeStore(store)
}

// ---------------------------------------------------------------------------
// Partner refresh tokens
// ---------------------------------------------------------------------------

export async function createFilePartnerRefreshToken(input: {
  partnerId: string
  tokenHash: string
  expiresAt: Date
}): Promise<void> {
  const store = await readStore()
  store.refreshTokens.push({
    id: randomUUID(),
    partnerId: input.partnerId,
    tokenHash: input.tokenHash,
    expiresAt: input.expiresAt.toISOString(),
    revoked: false,
    createdAt: new Date().toISOString(),
  })
  await writeStore(store)
}

export async function findFilePartnerRefreshToken(
  tokenHash: string
): Promise<(FilePartnerRefreshToken & { partner: FilePartnerRecord | null }) | null> {
  const store = await readStore()
  const token = store.refreshTokens.find((t) => t.tokenHash === tokenHash)
  if (!token) return null

  const partner = store.partners.find((item) => item.id === token.partnerId) ?? null
  return { ...token, partner }
}

export async function revokeFilePartnerRefreshTokenById(id: string): Promise<void> {
  const store = await readStore()
  store.refreshTokens = store.refreshTokens.map((token) =>
    token.id === id ? { ...token, revoked: true } : token
  )
  await writeStore(store)
}

export async function revokeFilePartnerRefreshTokens(
  partnerId: string,
  tokenHash?: string | null
): Promise<void> {
  const store = await readStore()
  store.refreshTokens = store.refreshTokens.map((token) => {
    if (token.partnerId !== partnerId) return token
    if (!tokenHash || token.tokenHash === tokenHash) {
      return { ...token, revoked: true }
    }
    return token
  })
  await writeStore(store)
}

export async function cleanupExpiredFilePartnerRefreshTokens(): Promise<void> {
  const now = Date.now()
  const store = await readStore()
  store.refreshTokens = store.refreshTokens.filter(
    (t) => !t.revoked && new Date(t.expiresAt).getTime() >= now
  )
  await writeStore(store)
}
