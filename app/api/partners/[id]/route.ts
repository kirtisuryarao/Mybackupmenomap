import { NextRequest, NextResponse } from 'next/server'

import { createInternalErrorResponse } from '@/lib/api-error'
import { authenticateRequest } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) {
      return authResult.error
    }

    const { user } = authResult
    const { id: partnerId } = await params

    // Verify partner belongs to user
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
    })

    if (!partner) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      )
    }

    if (partner.userId !== user.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    await prisma.partner.delete({
      where: { id: partnerId },
    })

    return NextResponse.json({ message: 'Partner deleted successfully' })
  } catch (error) {
    return createInternalErrorResponse(error, 'Delete partner error', 'Failed to delete partner')
  }
}
