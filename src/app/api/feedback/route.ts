import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      const response = {
        success: false,
        message: 'Authentication required'
      };
      return NextResponse.json(response, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      const response = {
        success: false,
        message: 'Invalid token'
      };
      return NextResponse.json(response, { status: 401 });
    }

    const body = await request.json();
    const { rental_request_id, rating, feedback } = body;

    // Verify the user is authorized (must be the customer who rented)
    const rental = await prisma.rentalRequest.findUnique({
      where: { id: rental_request_id },
      select: { customer_id: true }
    });

    if (!rental || rental.customer_id !== decoded.userId) {
      const response = {
        success: false,
        message: 'Unauthorized to submit feedback for this rental'
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Create or update feedback
    const feedbackRecord = await prisma.feedback.upsert({
      where: {
        rental_request_id: rental_request_id,
      },
      update: {
        rating,
        feedback,
        submitted_at: new Date()
      },
      create: {
        rental_request_id: rental_request_id,
        rating,
        feedback,
        submitted_at: new Date()
      }
    });

    const response = {
      success: true,
      message: 'Feedback submitted successfully',
      data: feedbackRecord
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    console.error('Submit feedback error:', error);

    const response = {
      success: false,
      message: 'Failed to submit feedback'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
