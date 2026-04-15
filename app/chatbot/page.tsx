'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { LayoutWrapper } from '@/components/layout-wrapper'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Send, Trash2, Sparkles } from 'lucide-react'
import { authenticatedFetch } from '@/lib/auth-client'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const quickActions = [
  { label: '🩸 When is my next period?', message: 'When is my next period?' },
  { label: '🧠 Why mood swings?', message: 'Why do I get mood swings during my cycle?' },
  { label: '💊 PMS tips', message: 'What can I do to manage PMS symptoms?' },
  { label: '🏃 Exercise advice', message: 'What exercises are best for my current cycle phase?' },
  { label: '🥗 What should I eat?', message: 'What foods should I eat during my current phase?' },
  { label: '😴 Sleep issues', message: 'Why do I have trouble sleeping before my period?' },
]

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  // Load chat history on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await authenticatedFetch('/api/chat')
        if (res.ok) {
          const data = await res.json()
          setMessages(
            (data.messages || []).map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: new Date(m.timestamp),
            }))
          )
        }
      } catch {
        // silently fail — empty chat is fine
      } finally {
        setIsLoadingHistory(false)
      }
    }
    load()
  }, [])

  const sendMessage = async (text?: string) => {
    const content = (text ?? inputValue).trim()
    if (!content || isStreaming) return

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInputValue('')
    setIsStreaming(true)

    // Add a placeholder assistant message for streaming
    const assistantId = `a-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', timestamp: new Date() },
    ])

    try {
      const res = await authenticatedFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, stream: true }),
      })

      if (!res.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: 'Something went wrong. Please try again.' } : m
          )
        )
        return
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: 'Something went wrong. Please try again.' } : m
          )
        )
        return
      }

      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const payload = JSON.parse(line.slice(6))
            if (payload.content) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: m.content + payload.content } : m
                )
              )
            }
            if (payload.done && payload.messageId) {
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, id: payload.messageId } : m))
              )
            }
            if (payload.error) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content || 'Something went wrong. Please try again.' }
                    : m
                )
              )
            }
          } catch {
            // skip malformed chunks
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: 'Something went wrong. Please try again.' } : m
        )
      )
    } finally {
      setIsStreaming(false)
      inputRef.current?.focus()
    }
  }

  const clearChat = async () => {
    try {
      await authenticatedFetch('/api/chat', { method: 'DELETE' })
      setMessages([])
    } catch {
      // ignore
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage()
  }

  return (
    <LayoutWrapper>
      <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              AI Assistant
            </h1>
            <p className="text-sm text-muted-foreground">Ask me anything — health, math, coding, or general questions</p>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearChat} className="text-muted-foreground">
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p className="text-sm">Loading chat...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-6">
              <div className="text-center space-y-2">
                <Sparkles className="h-12 w-12 text-primary/30 mx-auto" />
                <p className="text-lg font-medium">How can I help you today?</p>
                <p className="text-sm text-muted-foreground">Ask anything or try a quick action below</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-md">
                {quickActions.map((qa) => (
                  <button
                    key={qa.label}
                    onClick={() => sendMessage(qa.message)}
                    className="text-left text-xs p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors"
                  >
                    {qa.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {msg.content}
                      {isStreaming && msg === messages[messages.length - 1] && msg.role === 'assistant' && (
                        <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse rounded-sm" />
                      )}
                    </p>
                    <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground/60'}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Input */}
        <Card className="shrink-0">
          <CardContent className="p-3">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder="Ask me anything..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isStreaming}
                className="flex-1 rounded-full border-0 bg-muted/50 focus-visible:ring-1"
                autoFocus
              />
              <Button
                type="submit"
                disabled={isStreaming || !inputValue.trim()}
                size="icon"
                className="rounded-full shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </LayoutWrapper>
  )
}
