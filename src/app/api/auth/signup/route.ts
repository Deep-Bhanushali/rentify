import { NextRequest, NextResponse } from 'next/server';
import { createUser, generateToken } from '@/lib/auth';
import { SignupRequest } from '@/types/auth';

export async function POST(request: NextRequest) {
  try {
    const body: SignupRequest = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const user = await createUser({ name, email, password });
    const token = generateToken(user);

    const response = NextResponse.json(
      {
        message: 'Account created successfully',
        user,
        token,
      },
      { status: 201 }
    );

    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Signup failed' },
      { status: 400 }
    );
  }
}
