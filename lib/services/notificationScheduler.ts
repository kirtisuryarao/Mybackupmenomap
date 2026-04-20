/**
 * Enhanced notification and reminder scheduling service
 * Provides flexible reminders with multiple notification types and customization
 */

export type NotificationType = 'browser' | 'in-app' | 'email'
export type ReminderFrequency = 'once' | 'daily' | 'weekly'

export interface ReminderConfig {
  id: string
  type: 'period' | 'ovulation' | 'medication' | 'custom'
  name: string
  date: Date
  notificationTypes: NotificationType[]
  frequency: ReminderFrequency
  daysBeforeNotification?: number
  enabled: boolean
  timezone?: string
}

export interface ReminderNotification {
  title: string
  body: string
  icon?: string
  tag: string
  data: {
    type: string
    action: string
    timestamp: number
  }
}

/**
 * Calculate next notification time
 */
export function getNextNotificationTime(
  eventDate: Date,
  daysBeforeNotification: number = 0,
): Date {
  const notificationDate = new Date(eventDate)
  notificationDate.setDate(notificationDate.getDate() - daysBeforeNotification)
  return notificationDate
}

/**
 * Check if a reminder should trigger now
 */
export function shouldReminderTrigger(reminder: ReminderConfig): boolean {
  const now = new Date()
  const notificationTime = getNextNotificationTime(reminder.date, reminder.daysBeforeNotification)

  if (!reminder.enabled) return false
  if (notificationTime > now) return false

  // Check if already notified today (for daily/weekly reminders)
  if (reminder.frequency === 'once') {
    const lastNotified = sessionStorage.getItem(`reminder-${reminder.id}-last-notified`)
    return !lastNotified
  }

  return true
}

/**
 * Build browser notification message
 */
export function buildReminderNotification(reminder: ReminderConfig): ReminderNotification {
  const messages = {
    period: {
      title: 'Period Starting Soon',
      body: 'Your period is expected soon. Log your health today to track your cycle.',
    },
    ovulation: {
      title: 'Fertility Window',
      body: 'Your fertility window is approaching. Track your cycle for better insights.',
    },
    medication: {
      title: 'Take Your Medication',
      body: `Time to take ${reminder.name}. Stay on schedule for best results.`,
    },
    custom: {
      title: reminder.name,
      body: 'Your reminder is here.',
    },
  }

  const message = messages[reminder.type] || messages.custom

  return {
    title: message.title,
    body: message.body,
    tag: `reminder-${reminder.type}`,
    data: {
      type: reminder.type,
      action: 'open-app',
      timestamp: Date.now(),
    },
  }
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

/**
 * Send browser notification
 */
export async function sendBrowserNotification(notification: ReminderNotification): Promise<boolean> {
  if (!('Notification' in window)) {
    return false
  }

  if (Notification.permission !== 'granted') {
    return false
  }

  try {
    const n = new Notification(notification.title, {
      body: notification.body,
      icon: notification.icon || '/icon-192x192.png',
      tag: notification.tag,
      badge: '/badge-192x192.png',
      data: notification.data,
    })

    n.onclick = () => {
      window.focus()
      n.close()
    }

    return true
  } catch (error) {
    console.error('Failed to send notification:', error)
    return false
  }
}

/**
 * Format reminder time string for UI
 */
export function formatReminderTime(date: Date, now: Date = new Date()): string {
  const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntil === 0) {
    return 'Today'
  } else if (daysUntil === 1) {
    return 'Tomorrow'
  } else if (daysUntil > 1 && daysUntil <= 7) {
    return `In ${daysUntil} days`
  } else if (daysUntil <= 30) {
    const weeks = Math.floor(daysUntil / 7)
    return `In ${weeks} week${weeks > 1 ? 's' : ''}`
  }

  return date.toLocaleDateString()
}

/**
 * Check if reminder is urgent (within 3 days)
 */
export function isReminderUrgent(reminder: ReminderConfig): boolean {
  const now = new Date()
  const daysUntil = Math.ceil((reminder.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return daysUntil > 0 && daysUntil <= 3
}

/**
 * Validate reminder configuration
 */
export function validateReminder(reminder: Partial<ReminderConfig>): string[] {
  const errors: string[] = []

  if (!reminder.name) errors.push('Reminder name is required')
  if (!reminder.date) errors.push('Reminder date is required')
  if (!reminder.notificationTypes || reminder.notificationTypes.length === 0) {
    errors.push('At least one notification type must be selected')
  }
  if (reminder.date && reminder.date < new Date()) {
    errors.push('Reminder date must be in the future')
  }

  return errors
}
