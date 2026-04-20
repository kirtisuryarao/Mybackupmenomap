import { prisma } from '@/lib/prisma'

export interface HealthReportData {
  exportedAt: string
  user: {
    name: string
    email: string
    age?: number
    cycleLength: number
    periodDuration: number
  }
  cycleData: {
    lastPeriodDate?: string
    cycleEntries: Array<{
      date: string
      cycleLength: number
      periodDuration: number
    }>
  }
  logs: {
    dailyLogs: Array<{
      date: string
      flow?: string
      spotting?: string
      mood: string[]
      symptoms: string[]
      temperature?: number
      sleepQuality?: string
      notes?: string
    }>
    symptomLogs: Array<{
      date: string
      category: string
      symptoms: string[]
      severity: number
      mood?: string
      notes?: string
    }>
    fertilityLogs: Array<{
      date: string
      basalTemp?: number
      cervicalMucus?: string
      ovulationTest?: boolean
      intercourse?: boolean
    }>
    medications: Array<{
      name: string
      dosage: string
      frequency: string
      startDate: string
      endDate?: string
      notes?: string
    }>
  }
  insights: {
    predictions: Array<{
      predictedPeriodDate: string
      ovulationDate: string
      fertileWindowStart: string
      fertileWindowEnd: string
      confidence: number
      method: string
    }>
  }
  settings: {
    privacySettings: {
      profilePublic: boolean
      shareWithPartner: boolean
      allowHealthInsight: boolean
    }
    notificationSettings: {
      periodReminder: boolean
      phaseChange: boolean
      pushNotifications: boolean
      emailNotifications: boolean
    }
  }
}

export async function generateHealthReport(userId: string): Promise<HealthReportData> {
  const [user, cycleEntries, dailyLogs, symptomLogs, fertilityLogs, medications, predictions, privacySettings, notificationSettings] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.cycleEntry.findMany({ where: { userId }, orderBy: { lastPeriodDate: 'desc' } }),
      prisma.dailyLog.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
      prisma.symptomLog.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
      prisma.fertilityLog.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
      prisma.medication.findMany({ where: { userId }, orderBy: { startDate: 'desc' } }),
      prisma.prediction.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 12 }),
      prisma.privacySettings.findUnique({ where: { userId } }),
      prisma.notificationSettings.findUnique({ where: { userId } }),
    ])

  if (!user) {
    throw new Error('User not found')
  }

  return {
    exportedAt: new Date().toISOString(),
    user: {
      name: user.name,
      email: user.email,
      age: user.age || undefined,
      cycleLength: user.cycleLength,
      periodDuration: user.periodDuration,
    },
    cycleData: {
      lastPeriodDate: cycleEntries[0]?.lastPeriodDate?.toISOString().split('T')[0],
      cycleEntries: cycleEntries.map((entry) => ({
        date: entry.lastPeriodDate.toISOString().split('T')[0],
        cycleLength: entry.cycleLength,
        periodDuration: user.periodDuration,
      })),
    },
    logs: {
      dailyLogs: dailyLogs.map((log) => ({
        date: log.date.toISOString().split('T')[0],
        flow: log.flow || undefined,
        spotting: log.spotting || undefined,
        mood: log.mood || [],
        symptoms: log.symptoms || [],
        temperature: log.temperature || undefined,
        sleepQuality: log.sleepQuality || undefined,
        notes: log.notes || undefined,
      })),
      symptomLogs: symptomLogs.map((log) => ({
        date: log.date.toISOString().split('T')[0],
        category: log.category,
        symptoms: log.symptoms || [],
        severity: log.severity,
        mood: log.mood || undefined,
        notes: log.notes || undefined,
      })),
      fertilityLogs: fertilityLogs.map((log) => ({
        date: log.date.toISOString().split('T')[0],
        basalTemp: log.basalTemp || undefined,
        cervicalMucus: log.cervicalMucus || undefined,
        ovulationTest: log.ovulationTest || undefined,
        intercourse: log.intercourse || undefined,
      })),
      medications: medications.map((med) => ({
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        startDate: med.startDate.toISOString().split('T')[0],
        endDate: med.endDate?.toISOString().split('T')[0],
        notes: med.notes || undefined,
      })),
    },
    insights: {
      predictions: predictions.map((pred) => ({
        predictedPeriodDate: pred.predictedPeriodDate.toISOString().split('T')[0],
        ovulationDate: pred.ovulationDate.toISOString().split('T')[0],
        fertileWindowStart: pred.fertileWindowStart.toISOString().split('T')[0],
        fertileWindowEnd: pred.fertileWindowEnd.toISOString().split('T')[0],
        confidence: pred.confidence,
        method: pred.method,
      })),
    },
    settings: {
      privacySettings: privacySettings
        ? {
            profilePublic: privacySettings.profilePublic,
            shareWithPartner: privacySettings.shareWithPartner,
            allowHealthInsight: privacySettings.allowHealthInsight,
          }
        : {
            profilePublic: false,
            shareWithPartner: false,
            allowHealthInsight: true,
          },
      notificationSettings: notificationSettings
        ? {
            periodReminder: notificationSettings.periodReminder,
            phaseChange: notificationSettings.phaseChange,
            pushNotifications: notificationSettings.pushNotifications,
            emailNotifications: notificationSettings.emailNotifications,
          }
        : {
            periodReminder: true,
            phaseChange: true,
            pushNotifications: false,
            emailNotifications: false,
          },
    },
  }
}

export async function generateCSVReport(userId: string): Promise<string> {
  const report = await generateHealthReport(userId)

  const headers = ['Date', 'Type', 'Flow', 'Spotting', 'Mood', 'Symptoms', 'Temperature', 'Sleep Quality', 'Notes']
  const rows: string[] = []

  // Daily logs
  report.logs.dailyLogs.forEach((log) => {
    rows.push(
      [
        log.date,
        'Daily Log',
        log.flow || '',
        log.spotting || '',
        log.mood.join('; '),
        log.symptoms.join('; '),
        log.temperature || '',
        log.sleepQuality || '',
        log.notes || '',
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(','),
    )
  })

  return [headers.join(','), ...rows].join('\n')
}
