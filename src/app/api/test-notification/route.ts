import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { NotificationService } from '@/lib/notifications';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create a test notification
    const timestamp = Date.now();
    const testNotification = await NotificationService.createNotification({
      userId: decoded.userId,
      type: 'new_request',
      title: `Test Notification ${timestamp}`,
      message: 'This is a test notification to check real-time updates. Created at: ' + new Date(timestamp).toLocaleString(),
    });

    return NextResponse.json({
      success: true,
      notification: testNotification,
      message: 'Test notification created',
    });
  } catch (error) {
    console.error('Error creating test notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
