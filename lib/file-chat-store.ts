import { randomUUID } from 'crypto'
import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FileChatMessage {
  id: string
  userId: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string // ISO string
}

interface FileChatStore {
  messages: FileChatMessage[]
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

const STORE_DIR = path.join(process.cwd(), '.data')
const CHAT_STORE_FILE = path.join(STORE_DIR, 'chat-store.json')

async function readStore(): Promise<FileChatStore> {
  try {
    const content = await readFile(CHAT_STORE_FILE, 'utf8')
    const parsed = JSON.parse(content) as Partial<FileChatStore>
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
    }
  } catch {
    return { messages: [] }
  }
}

async function writeStore(store: FileChatStore): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true })
  await writeFile(CHAT_STORE_FILE, JSON.stringify(store, null, 2), 'utf8')
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Retrieve the last `limit` messages for a user, oldest first. */
export async function getFileChatMessages(
  userId: string,
  limit = 50
): Promise<FileChatMessage[]> {
  const store = await readStore()
  const userMessages = store.messages.filter((m) => m.userId === userId)
  // Return oldest-first, up to limit
  return userMessages.slice(-limit)
}

/** Save a single chat message and return it. */
export async function saveFileChatMessage(input: {
  userId: string
  role: 'user' | 'assistant'
  content: string
}): Promise<FileChatMessage> {
  const store = await readStore()
  const record: FileChatMessage = {
    id: randomUUID(),
    userId: input.userId,
    role: input.role,
    content: input.content,
    timestamp: new Date().toISOString(),
  }
  store.messages.push(record)

  // Keep at most 500 messages total to avoid unbounded growth
  if (store.messages.length > 500) {
    store.messages = store.messages.slice(-500)
  }

  await writeStore(store)
  return record
}

/** Delete all messages for a user. */
export async function deleteFileChatMessages(userId: string): Promise<void> {
  const store = await readStore()
  store.messages = store.messages.filter((m) => m.userId !== userId)
  await writeStore(store)
}
