import { randomUUID } from 'crypto'
import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'

export interface FileDailyLog {
  id: string
  userId: string
  date: string // YYYY-MM-DD
  flow: string | null
  spotting: string | null
  mood: string[]
  symptoms: string[]
  temperature: number | null
  sleepQuality: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface FileLogStore {
  logs: FileDailyLog[]
}

const STORE_DIR = path.join(process.cwd(), '.data')
const STORE_FILE = path.join(STORE_DIR, 'log-store.json')

async function readStore(): Promise<FileLogStore> {
  try {
    const content = await readFile(STORE_FILE, 'utf8')
    const parsed = JSON.parse(content) as Partial<FileLogStore>

    return {
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
    }
  } catch {
    return { logs: [] }
  }
}

async function writeStore(store: FileLogStore): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true })
  await writeFile(STORE_FILE, JSON.stringify(store, null, 2), 'utf8')
}

function normalizeDateString(input: string): string {
  // Keep only the YYYY-MM-DD portion if a timestamp sneaks in.
  return input.split('T')[0]
}

export async function getFileDailyLogs(userId: string, limit = 90): Promise<FileDailyLog[]> {
  const store = await readStore()

  return store.logs
    .filter((log) => log.userId === userId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, Math.max(1, Math.min(limit, 365)))
}

export async function upsertFileDailyLog(input: {
  userId: string
  date: string
  flow: string | null
  spotting: string | null
  mood: string[]
  symptoms: string[]
  temperature: number | null
  sleepQuality: string | null
  notes: string | null
}): Promise<FileDailyLog> {
  const store = await readStore()
  const now = new Date().toISOString()
  const date = normalizeDateString(input.date)

  const existingIndex = store.logs.findIndex((l) => l.userId === input.userId && l.date === date)

  if (existingIndex !== -1) {
    const updated: FileDailyLog = {
      ...store.logs[existingIndex],
      flow: input.flow,
      spotting: input.spotting,
      mood: input.mood,
      symptoms: input.symptoms,
      temperature: input.temperature,
      sleepQuality: input.sleepQuality,
      notes: input.notes,
      updatedAt: now,
    }
    store.logs[existingIndex] = updated
    await writeStore(store)
    return updated
  }

  const created: FileDailyLog = {
    id: randomUUID(),
    userId: input.userId,
    date,
    flow: input.flow,
    spotting: input.spotting,
    mood: input.mood,
    symptoms: input.symptoms,
    temperature: input.temperature,
    sleepQuality: input.sleepQuality,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  }

  store.logs.push(created)
  await writeStore(store)
  return created
}

export async function deleteFileDailyLogById(userId: string, id: string): Promise<boolean> {
  const store = await readStore()
  const before = store.logs.length
  store.logs = store.logs.filter((log) => !(log.userId === userId && log.id === id))

  if (store.logs.length === before) {
    return false
  }

  await writeStore(store)
  return true
}
