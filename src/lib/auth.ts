import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, LoginRequest, SignupRequest } from '../types/auth';
import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';
import { JWT_SECRET, JWT_EXPIRES_IN } from './config';

const prisma = new PrismaClient();

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(user: User): string {
  return jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
  } catch {
    return null;
  }
}

export function getCurrentUser(request: NextRequest): { userId: string; email: string } | null {
  try {
    const authorization = request.headers.get('authorization');

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return null;
    }

    const token = authorization.replace('Bearer ', '');
    return verifyToken(token);
  } catch {
    return null;
  }
}

export async function createUser(userData: SignupRequest): Promise<User> {
  try {
    await prisma.$connect();

    const hashedPassword = await hashPassword(userData.password);

    const newUser = await prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
      },
    });

    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      createdAt: newUser.createdAt,
    };
  } catch (error: any) {
    console.error('Create user error:', error);

    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      throw new Error('User already exists');
    }

    if (error.code === 'P1001') {
      throw new Error('Database server unreachable');
    }

    if (error.code === 'P2003') {
      throw new Error('Invalid user data');
    }

    throw new Error(`Database error: ${error.message || 'Unknown error'}`);
  }
}

export async function authenticateUser(credentials: LoginRequest): Promise<User> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: credentials.email },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await verifyPassword(credentials.password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  } catch (error: any) {
    console.error('Authenticate user error:', error);

    if (error.message === 'Invalid credentials') {
      throw error; // Re-throw our custom errors
    }

    if (error.code === 'P1001') {
      throw new Error('Database server unreachable');
    }

    throw new Error(`Database error: ${error.message || 'Unknown error'}`);
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  } catch (error: any) {
    console.error('Get user by ID error:', error);

    if (error.code === 'P1001') {
      throw new Error('Database server unreachable');
    }

    throw new Error(`Database error: ${error.message || 'Unknown error'}`);
  }
}
