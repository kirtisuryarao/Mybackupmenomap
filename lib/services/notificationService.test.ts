import {
  getNotificationPermission,
  requestNotificationPermission,
  sendNotification,
  scheduleNotificationForDate,
} from '@/lib/services/notificationService'

describe('notificationService', () => {
  class NotificationMock {
    static permission: NotificationPermission = 'default'
    static requestPermission = jest.fn<Promise<NotificationPermission>, []>().mockResolvedValue('granted')

    title: string
    options: Record<string, unknown> | undefined

    constructor(title: string, options?: Record<string, unknown>) {
      this.title = title
      this.options = options
    }
  }

  let NotificationConstructor: jest.MockedClass<typeof NotificationMock>

  beforeEach(() => {
    jest.useFakeTimers()
    Object.assign(globalThis, { window: globalThis })

    NotificationConstructor = jest.fn().mockImplementation((title: string, options?: Record<string, unknown>) => {
      return new NotificationMock(title, options)
    }) as unknown as jest.MockedClass<typeof NotificationMock>
    NotificationConstructor.permission = 'default'
    NotificationConstructor.requestPermission = jest.fn<Promise<NotificationPermission>, []>().mockResolvedValue('granted')

    Object.assign(globalThis, { Notification: NotificationConstructor })
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
    delete (globalThis as { window?: unknown }).window
    delete (globalThis as { Notification?: unknown }).Notification
  })

  describe('getNotificationPermission', () => {
    it('should return current permission state', () => {
      NotificationConstructor.permission = 'granted'

      const perm = getNotificationPermission()

      expect(perm).toBe('granted')
    })

    it('should return default when permission not granted', () => {
      NotificationConstructor.permission = 'default'

      const perm = getNotificationPermission()

      expect(perm).toBe('default')
    })

    it('should return denied when permission is denied', () => {
      NotificationConstructor.permission = 'denied'

      const perm = getNotificationPermission()

      expect(perm).toBe('denied')
    })
  })

  describe('requestNotificationPermission', () => {
    it('should request user permission', async () => {
      NotificationConstructor.permission = 'default'

      const perm = await requestNotificationPermission()

      expect(NotificationConstructor.requestPermission).toHaveBeenCalled()
      expect(perm).toBe('granted')
    })

    it('should return existing permission if already granted', async () => {
      NotificationConstructor.permission = 'granted'

      const perm = await requestNotificationPermission()

      expect(perm).toBe('granted')
      expect(NotificationConstructor.requestPermission).not.toHaveBeenCalled()
    })

    it('should return existing permission if already denied', async () => {
      NotificationConstructor.permission = 'denied'

      const perm = await requestNotificationPermission()

      expect(perm).toBe('denied')
      expect(NotificationConstructor.requestPermission).not.toHaveBeenCalled()
    })
  })

  describe('sendNotification', () => {
    it('should create a notification when permission is granted', () => {
      NotificationConstructor.permission = 'granted'

      sendNotification({
        title: 'Test Title',
        body: 'Test Body',
      })

      expect(NotificationConstructor).toHaveBeenCalledWith('Test Title', expect.any(Object))
    })

    it('should not create notification when permission is not granted', () => {
      NotificationConstructor.permission = 'denied'

      sendNotification({
        title: 'Test Title',
        body: 'Test Body',
      })

      expect(NotificationConstructor).not.toHaveBeenCalled()
    })

    it('should pass custom options to Notification', () => {
      NotificationConstructor.permission = 'granted'

      sendNotification({
        title: 'Period Reminder',
        body: 'Your period is starting',
        tag: 'period-reminder',
        requireInteraction: true,
      })

      expect(NotificationConstructor).toHaveBeenCalledWith('Period Reminder', {
        body: 'Your period is starting',
        tag: 'period-reminder',
        badge: '/icon-192.png',
        icon: '/icon-192.png',
        requireInteraction: true,
      })
    })
  })

  describe('scheduleNotificationForDate', () => {
    it('should schedule notification for future date', () => {
      NotificationConstructor.permission = 'granted'

      const futureDate = new Date(Date.now() + 5000)
      const onScheduled = jest.fn()

      const cancel = scheduleNotificationForDate(
        futureDate,
        { title: 'Test', body: 'Body' },
        onScheduled
      )

      expect(onScheduled).toHaveBeenCalled()
      expect(NotificationConstructor).not.toHaveBeenCalled()

      jest.advanceTimersByTime(5000)

      expect(NotificationConstructor).toHaveBeenCalled()
    })

    it('should send notification immediately for past date', () => {
      NotificationConstructor.permission = 'granted'

      const pastDate = new Date(Date.now() - 1000)

      scheduleNotificationForDate(pastDate, { title: 'Test', body: 'Body' })

      expect(NotificationConstructor).toHaveBeenCalled()
    })

    it('should return cancel function', () => {
      NotificationConstructor.permission = 'granted'

      const futureDate = new Date(Date.now() + 5000)

      const cancel = scheduleNotificationForDate(futureDate, { title: 'Test', body: 'Body' })

      cancel()
      jest.advanceTimersByTime(5000)

      expect(NotificationConstructor).not.toHaveBeenCalled()
    })
  })
})
