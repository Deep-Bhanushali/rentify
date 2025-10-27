import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyToken } from '@/lib/auth'
import { unstable_cache, revalidateTag } from 'next/cache'

const prisma = new PrismaClient()

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    // Cache the expensive database queries
    const cachedNotifications = unstable_cache(
      async () => {
        const notifications = await prisma.notification.findMany({
          where: {
            userId: decoded.userId,
            ...(unreadOnly && { isRead: false })
          },
          include: {
            rentalRequest: {
              include: {
                product: {
                  select: {
                    id: true,
                    title: true,
                    rental_price: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: limit
        });
        return notifications;
      },
      [`notifications-${decoded.userId}-${unreadOnly}-${limit}`],
      {
        revalidate: 60,
        tags: ['notifications']
      }
    );

    const cachedUnreadCount = unstable_cache(
      async () => {
        const count = await prisma.notification.count({
          where: {
            userId: decoded.userId,
            isRead: false
          }
        });
        return count;
      },
      [`notification-count-${decoded.userId}`],
      {
        revalidate: 60,
        tags: ['notifications']
      }
    );

    const [notifications, unreadCount] = await Promise.all([
      cachedNotifications(),
      cachedUnreadCount()
    ]);

    const response = NextResponse.json({
      success: true,
      data: notifications,
      unreadCount
    });

    // Add caching headers
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');

    return response;
  } catch (error: any) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/notifications - Create a new notification
export async function POST(request: NextRequest) {
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
    const { userId, rentalRequestId, type, title, message, data } = body

    const notification = await prisma.notification.create({
      data: {
        userId,
        rentalRequestId: rentalRequestId || null,
        type,
        title,
        message,
        data: data ? JSON.stringify(data) : null
      }
    })

    // Notification caches will be invalidated by client-side revalidation

    return NextResponse.json({
      success: true,
      data: notification
    })
  } catch (error: any) {
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
