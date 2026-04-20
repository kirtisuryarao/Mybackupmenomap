export type NotificationPermission = 'default' | 'granted' | 'denied'

export interface NotificationOptions {
  title: string
  body: string
  tag?: string
  badge?: string
  icon?: string
  requireInteraction?: boolean
}

function isBrowser() {
  return typeof window !== 'undefined' && typeof Notification !== 'undefined'
}

export function getNotificationPermission(): NotificationPermission {
  if (!isBrowser()) return 'default'
  return (Notification.permission as NotificationPermission) || 'default'
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isBrowser()) return 'default'

  if (Notification.permission !== 'default') {
    return Notification.permission as NotificationPermission
  }

  try {
    const permission = await Notification.requestPermission()
    return permission as NotificationPermission
  } catch {
    return 'default'
  }
}

export function sendNotification(options: NotificationOptions): void {
  if (!isBrowser()) return
  if (Notification.permission !== 'granted') return

  try {
    new Notification(options.title, {
      body: options.body,
      tag: options.tag || 'menomap-reminder',
      badge: options.badge || '/icon-192.png',
      icon: options.icon || '/icon-192.png',
      requireInteraction: options.requireInteraction ?? true,
    })
  } catch (error) {
    console.error('Failed to send notification:', error)
  }
}

export function scheduleNotificationForDate(
  date: Date,
  options: NotificationOptions,
  onScheduled?: () => void
): () => void {
  if (!isBrowser()) {
    return () => {}
  }

  const now = new Date()
  const delayMs = date.getTime() - now.getTime()

  if (delayMs <= 0) {
    sendNotification(options)
    return () => {}
  }

  const timeoutId = window.setTimeout(() => {
    sendNotification(options)
  }, delayMs)

  onScheduled?.()

  return () => {
    window.clearTimeout(timeoutId)
  }
}
