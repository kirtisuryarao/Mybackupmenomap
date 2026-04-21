'use client'

import { Send, Loader2, AlertCircle } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useCycleData } from '@/hooks/use-cycle-data'

interface Message {
id: string
role: 'user' | 'assistant'
content: string
timestamp: Date
}

const suggestedQuestions = [
'What can I do to manage PMS symptoms?',
'Is it normal to have mood changes during my cycle?',
'What exercises are best for my follicular phase?',
'How can I prepare for my period?',
'What foods should I eat during ovulation?',
'Can I exercise during my period?',
"What's the best way to track my symptoms?",
'How accurate is cycle prediction?',
]

const mockResponses: Record<string, string> = {
default:
'I understand your question. While I can provide general information about menstrual health, please consult with a healthcare provider for medical concerns specific to your situation. What else would you like to know?',
pms:
'PMS symptoms vary by person. Common approaches include: regular exercise, stress management, dietary changes (reduce caffeine and sugar), adequate sleep, and tracking your symptoms to identify patterns. Some people also benefit from magnesium or calcium supplements. If symptoms are severe, consult your doctor.',
mood:
'Mood changes are completely normal due to hormonal fluctuations throughout your cycle. Estrogen and progesterone levels change significantly, affecting neurotransmitters like serotonin. Self-compassion, communication with loved ones, and healthy coping strategies can help.',
exercise:
'Exercise is beneficial throughout your cycle, but you can adapt it to your phase. Follicular and ovulation phases are great for high-intensity workouts. Luteal and period phases benefit from gentler movement.',
period:
'To prepare for your period: stay hydrated, get extra sleep, keep menstrual products ready, prepare comfort measures like a heating pad, and maintain gentle activity if you feel comfortable.',
ovulation:
'During ovulation, energy levels and strength are typically highest. This is a great time for intense workouts, social activities, and completing demanding tasks.',
}

function getRelevantResponse(question: string): string {
const lower = question.toLowerCase()

if (lower.includes('hi') || lower.includes("hello")|| lower.includes("hey")) return "Hello! I am your MenoMap health assistant. How can I help you?"
if (lower.includes('pms') || lower.includes('symptom')) return mockResponses.pms
if (lower.includes('mood') || lower.includes('emotion')) return mockResponses.mood
if (lower.includes('exercise') || lower.includes('workout')) return mockResponses.exercise
if (lower.includes('period') || lower.includes('prepare')) return mockResponses.period
if (lower.includes('ovulation')) return mockResponses.ovulation

return mockResponses.default
}

export default function ChatbotPage() {
const { isLoading: cycleLoading } = useCycleData()

const [messages, setMessages] = useState<Message[]>([
{
id: '1',
role: 'assistant',
content:
"Hi! I'm your MenoMap AI assistant. I'm here to answer questions about menstrual and menopause health and support your wellness journey. How can I help you today?",
timestamp: new Date(),
},
])

const [inputValue, setInputValue] = useState('')
const [isLoading, setIsLoading] = useState(false)

const messagesContainerRef = useRef<HTMLDivElement>(null)

const scrollToBottom = () => {
const el = messagesContainerRef.current
if (el) {
el.scrollTop = el.scrollHeight
}
}

useEffect(() => {
scrollToBottom()
}, [messages])

const sendMessage = (text: string) => {
if (!text.trim()) return

const userMessage: Message = {
id: Date.now().toString(),
role: 'user',
content: text,
timestamp: new Date(),
}

setMessages((prev) => [...prev, userMessage])
setInputValue('')
setIsLoading(true)

setTimeout(() => {
const response = getRelevantResponse(text)

const assistantMessage: Message = {
id: (Date.now() + 1).toString(),
role: 'assistant',
content: response,
timestamp: new Date(),
}

setMessages((prev) => [...prev, assistantMessage])
setIsLoading(false)
}, 800)
}

const handleSendMessage = (e: React.FormEvent) => {
e.preventDefault()
sendMessage(inputValue)
}

const handleSuggestedQuestion = (question: string) => {
sendMessage(question)
}

if (cycleLoading) {
return (
<div className="text-center">Loading chatbot...</div>
)
}

return (
<div className="space-y-6">

<div>
<h1 className="text-3xl font-bold mb-2">AI Health Assistant</h1>
<p className="text-muted-foreground">
Get personalized answers about your menstrual health
</p>
</div>

<Card className="border-orange-200 bg-orange-50">
<CardContent className="pt-6 flex gap-3">
<AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
<p className="text-sm text-orange-800">
This AI provides general health information and is not a substitute for
professional medical advice.
</p>
</CardContent>
</Card>

<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

<div className="lg:col-span-3">
<Card className="flex flex-col h-96">

<CardContent
ref={messagesContainerRef}
className="flex-1 overflow-y-auto space-y-4 pt-6"

>

{messages.map((message) => (

<div
key={message.id}
className={`flex ${
message.role === 'user' ? 'justify-end' : 'justify-start'
}`}
>
<div
className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
message.role === 'user'
? 'bg-primary text-primary-foreground'
: 'bg-muted text-muted-foreground'
}`}
>
<p className="text-sm">{message.content}</p>
<p className="text-xs mt-1 opacity-70">
{message.timestamp.toLocaleTimeString([], {
hour: '2-digit',
minute: '2-digit',
})}
</p>
</div>
</div>
))}

{isLoading && (

<div className="flex justify-start">
<div className="bg-muted px-4 py-3 rounded-lg flex items-center gap-2">
<Loader2 className="h-4 w-4 animate-spin" />
<span className="text-sm">Thinking...</span>
</div>
</div>
)}
</CardContent>

<div className="border-t p-4">
<form onSubmit={handleSendMessage} className="flex gap-2">
<Input
type="text"
placeholder="Ask a health question..."
value={inputValue}
onChange={(e) => setInputValue(e.target.value)}
disabled={isLoading}
className="flex-1"
/>

<Button
type="submit"
disabled={isLoading || !inputValue.trim()}
size="sm"

>

<Send className="h-4 w-4" />
</Button>
</form>
</div>

</Card>
</div>

<div className="lg:col-span-1">
<Card>
<CardHeader>
<CardTitle className="text-base">Suggested Questions</CardTitle>
</CardHeader>

<CardContent className="space-y-2">
{suggestedQuestions.map((question, idx) => (
<button
key={idx}
onClick={() => handleSuggestedQuestion(question)}
className="w-full text-left text-xs p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-foreground transition"
>
{question}
</button>
))}
</CardContent>
</Card>
</div>

</div>

<Card>
<CardHeader>
<CardTitle className="text-base">How to Get Better Answers</CardTitle>
</CardHeader>

<CardContent>
<ul className="space-y-2 text-sm text-muted-foreground">
<li>• Be specific about symptoms</li>
<li>• Mention your cycle phase</li>
<li>• Ask about lifestyle changes</li>
<li>• Share cycle patterns</li>
</ul>
</CardContent>
</Card>

</div>
)
}
