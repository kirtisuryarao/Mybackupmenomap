'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, Send, X, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { authenticatedFetch } from '@/lib/auth-client'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const quickReplies = ['When is my next period?', 'Am I ovulating?', 'Why mood swings?']

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  // Load history when first opened
  useEffect(() => {
    if (!isOpen || historyLoaded) return
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
        // ignore
      } finally {
        setHistoryLoaded(true)
      }
    }
    load()
  }, [isOpen, historyLoaded])

  const sendMessage = async (rawMessage?: string) => {
    const content = (rawMessage ?? inputValue).trim()
    if (!content || isStreaming) return

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content, timestamp: new Date() }
    const assistantId = `a-${Date.now()}`

    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: 'assistant', content: '', timestamp: new Date() },
    ])
    setInputValue('')
    setIsStreaming(true)

    try {
      const res = await authenticatedFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, stream: true }),
      })

      if (!res.ok) {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: 'Something went wrong. Please try again.' } : m))
        )
        return
      }

      const reader = res.body?.getReader()
      if (!reader) return
      const decoder = new TextDecoder()
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
                prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + payload.content } : m))
              )
            }
            if (payload.done && payload.messageId) {
              setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, id: payload.messageId } : m)))
            }
            if (payload.error) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: m.content || 'Something went wrong. Please try again.' } : m
                )
              )
            }
          } catch {
            // skip
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: 'Something went wrong. Please try again.' } : m))
      )
    } finally {
      setIsStreaming(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 hover:scale-110 hover:bg-primary/90"
        aria-label="AI Chat"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 z-40 flex max-h-[520px] w-[360px] flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-5 duration-300 border">
          {/* Header */}
          <div className="flex items-center gap-2 border-b bg-primary p-3 text-primary-foreground">
            <Sparkles className="h-5 w-5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold">AI Assistant</h3>
              <p className="text-[10px] text-primary-foreground/70">Ask me anything</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/10">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                <Sparkles className="h-10 w-10 text-primary/30" />
                <p className="text-xs">Ask me anything!</p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {quickReplies.map((qr) => (
                    <button
                      key={qr}
                      onClick={() => sendMessage(qr)}
                      disabled={isStreaming}
                      className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] text-primary hover:bg-primary/10 transition-colors"
                    >
                      {qr}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted rounded-bl-md'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {msg.content}
                        {isStreaming && msg === messages[messages.length - 1] && msg.role === 'assistant' && (
                          <span className="inline-block w-1 h-3.5 bg-current ml-0.5 animate-pulse rounded-sm" />
                        )}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="border-t p-2.5 flex gap-2">
            <Input
              ref={inputRef}
              placeholder="Ask me anything..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              className="flex-1 rounded-full text-sm h-9"
            />
            <Button
              onClick={() => sendMessage()}
              disabled={isStreaming || !inputValue.trim()}
              size="icon"
              className="rounded-full h-9 w-9 shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </Card>
      )}
    </>
  )
}
