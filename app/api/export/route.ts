import { NextRequest, NextResponse } from 'next/server'

import { createInternalErrorResponse } from '@/lib/api-error'
import { authenticateRequest } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/export - Export user data as CSV
 * Query: ?type=logs|cycles|all (default: all)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) return authResult.error

    const { user } = authResult
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'

    let csv = ''

    if (type === 'logs' || type === 'all') {
      const logs = await prisma.dailyLog.findMany({
        where: { userId: user.userId },
        orderBy: { date: 'asc' },
      })

      csv += 'DAILY LOGS\n'
      csv += 'Date,Flow,Spotting,Mood,Symptoms,Temperature,Sleep Quality,Notes\n'
      for (const log of logs) {
        csv += [
          log.date.toISOString().split('T')[0],
          log.flow || '',
          log.spotting || '',
          `"${log.mood.join(', ')}"`,
          `"${log.symptoms.join(', ')}"`,
          log.temperature?.toString() || '',
          log.sleepQuality || '',
          `"${(log.notes || '').replace(/"/g, '""')}"`,
        ].join(',') + '\n'
      }
      csv += '\n'
    }

    if (type === 'cycles' || type === 'all') {
      const cycles = await prisma.cycle.findMany({
        where: { userId: user.userId },
        orderBy: { startDate: 'asc' },
      })

      csv += 'CYCLES\n'
      csv += 'Start Date,End Date,Cycle Length,Period Length\n'
      for (const cycle of cycles) {
        csv += [
          cycle.startDate.toISOString().split('T')[0],
          cycle.endDate?.toISOString().split('T')[0] || 'ongoing',
          cycle.length?.toString() || '',
          cycle.periodLength?.toString() || '',
        ].join(',') + '\n'
      }
      csv += '\n'
    }

    if (type === 'all') {
      const predictions = await prisma.prediction.findMany({
        where: { userId: user.userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      })

      csv += 'PREDICTIONS\n'
      csv += 'Predicted Period Date,Ovulation Date,Fertile Window Start,Fertile Window End,Confidence,Method\n'
      for (const pred of predictions) {
        csv += [
          pred.predictedPeriodDate.toISOString().split('T')[0],
          pred.ovulationDate.toISOString().split('T')[0],
          pred.fertileWindowStart.toISOString().split('T')[0],
          pred.fertileWindowEnd.toISOString().split('T')[0],
          pred.confidence.toFixed(2),
          pred.method,
        ].join(',') + '\n'
      }
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="menomap-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    return createInternalErrorResponse(error, 'Export error', 'Failed to export data')
  }
}
