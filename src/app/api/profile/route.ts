import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { verifyToken } from '@/lib/auth';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import path from 'path';

const prisma = new PrismaClient();

interface ProfileUpdateData {
  name?: string;
  email?: string;
  password?: string;
  profile_photo?: string;
}

// GET /api/profile - Get current user profile
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userProfile = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        profile_photo: true,
        createdAt: true,
        // Exclude password
      },
    });

    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(userProfile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// PUT /api/profile - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    let body: {
      name?: string;
      email?: string;
      currentPassword?: string;
      newPassword?: string;
    } = {};
    let profilePhotoFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData (file upload)
      const formData = await request.formData();
      const profilePhoto = formData.get('profile_photo');
      profilePhotoFile = profilePhoto instanceof File ? profilePhoto : null;

      // Extract other fields from the form data
      const name = formData.get('name') as string | null;
      const email = formData.get('email') as string | null;

      if (name !== null && name !== undefined) body.name = name;
      if (email !== null && email !== undefined) body.email = email;
    } else {
      // Handle JSON (regular profile update)
      body = await request.json();
    }

    const { name, email, currentPassword, newPassword } = body;

    const updateData: ProfileUpdateData = {};

    // Validate required fields for profile updates
    if (name !== undefined) {
      if (!name || !name.trim()) {
        return NextResponse.json(
          { error: 'Name cannot be empty' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (email !== undefined) {
      if (!email || !email.trim()) {
        return NextResponse.json(
          { error: 'Email cannot be empty' },
          { status: 400 }
        );
      }

      // Check if email is already taken by another user
      const existingUser = await prisma.user.findFirst({
        where: {
          email: email.trim(),
          NOT: { id: user.userId },
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'Email is already taken' },
          { status: 400 }
        );
      }

      updateData.email = email.trim();
    }

    // Handle profile photo upload
    if (profilePhotoFile) {
      try {
        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'profiles');
        mkdirSync(uploadsDir, { recursive: true });

        // Generate unique filename
        const fileExtension = path.extname(profilePhotoFile.name);
        const fileName = `${user.userId}-${Date.now()}${fileExtension}`;
        const filePath = path.join(uploadsDir, fileName);

        // Convert File to Buffer and save
        const buffer = Buffer.from(await profilePhotoFile.arrayBuffer());
        writeFileSync(filePath, buffer);

        // Store relative path in database
        updateData.profile_photo = `/uploads/profiles/${fileName}`;
      } catch (error) {
        console.error('Error handling profile photo upload:', error);
        return NextResponse.json(
          { error: 'Failed to upload profile photo' },
          { status: 500 }
        );
      }
    }

    // Ensure we have something to update for regular JSON requests
    if (!contentType.includes('multipart/form-data') && Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided for update' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        profile_photo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

// DELETE /api/profile - Delete user account
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }


    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required to delete account' },
        { status: 400 }
      );
    }

    // Get current user data to verify password
    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { password: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isValidPassword = await bcrypt.compare(password, currentUser.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Password is incorrect' },
        { status: 400 }
      );
    }

    // Delete user account (CASCADE delete will handle related records)
    await prisma.user.delete({
      where: { id: user.userId },
    });

    return NextResponse.json({
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
