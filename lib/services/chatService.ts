import { prisma } from '@/lib/prisma'
import { isPrismaConnectionError, canUseFileAuthFallback } from '@/lib/db-fallback'
import {
  deleteFileChatMessages,
  getFileChatMessages,
  saveFileChatMessage,
} from '@/lib/file-chat-store'

export type ChatRole = 'user' | 'assistant'

export interface ChatMessageRecord {
  id: string
  userId: string
  role: ChatRole
  content: string
  createdAt: string
}

function normalizeDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}

function normalizeChatMessage(record: {
  id: string
  userId: string
  role: string
  content: string
  createdAt?: Date | string
  timestamp?: Date | string
}): ChatMessageRecord {
  return {
    id: record.id,
    userId: record.userId,
    role: record.role as ChatRole,
    content: record.content,
    createdAt: normalizeDate(record.createdAt ?? record.timestamp ?? new Date()),
  }
}

export async function createMessage(
  userId: string,
  role: ChatRole,
  content: string,
): Promise<ChatMessageRecord> {
  try {
    const message = await prisma.chatMessage.create({
      data: { userId, role, content },
      select: {
        id: true,
        userId: true,
        role: true,
        content: true,
        createdAt: true,
      },
    })

    return normalizeChatMessage(message)
  } catch (error) {
    if (isPrismaConnectionError(error) && canUseFileAuthFallback()) {
      return normalizeChatMessage(await saveFileChatMessage({ userId, role, content }))
    }

    throw error
  }
}

export async function storeAIResponse(userId: string, response: string): Promise<ChatMessageRecord> {
  return createMessage(userId, 'assistant', response)
}

export async function getChatHistory(userId: string): Promise<ChatMessageRecord[]> {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: {
        id: true,
        userId: true,
        role: true,
        content: true,
        createdAt: true,
      },
    })

    return messages.map(normalizeChatMessage)
  } catch (error) {
    if (isPrismaConnectionError(error) && canUseFileAuthFallback()) {
      const fallbackMessages = await getFileChatMessages(userId, 100)
      return fallbackMessages.map((message) =>
        normalizeChatMessage({
          id: message.id,
          userId: message.userId,
          role: message.role,
          content: message.content,
          createdAt: message.timestamp,
        })
      )
    }

    throw error
  }
}

export async function clearChatHistory(userId: string): Promise<void> {
  try {
    await prisma.chatMessage.deleteMany({ where: { userId } })
  } catch (error) {
    if (isPrismaConnectionError(error) && canUseFileAuthFallback()) {
      await deleteFileChatMessages(userId)
      return
    }

    throw error
  }

  await deleteFileChatMessages(userId).catch(() => {})
}