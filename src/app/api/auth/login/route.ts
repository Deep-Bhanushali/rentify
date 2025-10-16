import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, generateToken } from '@/lib/auth';
import { LoginRequest } from '@/types/auth';

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await authenticateUser({ email, password });
    const token = generateToken(user);

    const response = NextResponse.json(
      {
        message: 'Login successful',
        user,
        token,
      },
      { status: 200 }
    );

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Login failed' },
      { status: 401 }
    );
  }
}
