import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyToken } from '@/lib/auth'

const prisma = new PrismaClient()

// PATCH /api/notifications/mark-read - Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { notificationIds, markAll } = body

    if (markAll) {
      // Mark all notifications as read for the user
      const result = await prisma.notification.updateMany({
        where: {
          userId: decoded.userId,
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        message: `Marked ${result.count} notifications as read`
      })
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      const result = await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: decoded.userId
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        message: `Marked ${result.count} notifications as read`
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid request. Provide notificationIds array or markAll=true' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Error marking notifications as read:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
