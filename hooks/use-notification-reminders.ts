'use client'

import { useEffect, useRef, useState } from 'react'

import { useI18n } from '@/components/i18n/language-provider'
import {
  getNotificationPermission,
  requestNotificationPermission,
  scheduleNotificationForDate,
  type NotificationPermission,
} from '@/lib/services/notificationService'

interface ReminderNotificationSetup {
  kind: 'period' | 'ovulation'
  date: Date
  enabled: boolean
}

interface UseNotificationRemindersResult {
  permission: NotificationPermission
  requestPermission: () => Promise<void>
  scheduleReminders: (reminders: ReminderNotificationSetup[]) => void
  clearReminders: () => void
}

export function useNotificationReminders(): UseNotificationRemindersResult {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const { t } = useI18n()
  const cancelFnsRef = useRef<Array<() => void>>([])

  useEffect(() => {
    setPermission(getNotificationPermission())
  }, [])

  const requestPermission = async () => {
    const result = await requestNotificationPermission()
    setPermission(result)
  }

  const clearReminders = () => {
    cancelFnsRef.current.forEach((cancel) => cancel())
    cancelFnsRef.current = []
  }

  const scheduleReminders = (reminders: ReminderNotificationSetup[]) => {
    clearReminders()

    if (permission !== 'granted') {
      return
    }

    for (const reminder of reminders) {
      if (!reminder.enabled || !reminder.date) {
        continue
      }

      const title = reminder.kind === 'period' ? t('notifications.periodTitle') : t('notifications.ovulationTitle')
      const body = reminder.kind === 'period' ? t('notifications.periodBody') : t('notifications.ovulationBody')

      const cancel = scheduleNotificationForDate(reminder.date, {
        title,
        body,
        tag: `menomap-${reminder.kind}-reminder`,
        requireInteraction: true,
      })

      cancelFnsRef.current.push(cancel)
    }
  }

  useEffect(() => {
    return () => {
      clearReminders()
    }
  }, [])

  return {
    permission,
    requestPermission,
    scheduleReminders,
    clearReminders,
  }
}
