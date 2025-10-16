import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { ApiResponse } from '@/types/models';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Check for token in cookies first, then Authorization header
    let token = request.cookies.get('token')?.value;
    if (!token) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Remove 'Bearer ' prefix
      }
    }

    if (!token) {
      const response: ApiResponse = {
        success: false,
        message: 'Authentication required'
      };
      return NextResponse.json(response, { status: 401 });
    }

    if (!token) {
      const response: ApiResponse = {
        success: false,
        message: 'Authentication required'
      };
      return NextResponse.json(response, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      const response: ApiResponse = {
        success: false,
        message: 'Invalid token'
      };
      return NextResponse.json(response, { status: 401 });
    }

    const wishlistItems = await prisma.wishlist.findMany({
      where: {
        user_id: decoded.userId
      },
      include: {
        product: {
          include: {
            user: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    const response: ApiResponse = {
      success: true,
      message: 'Wishlist fetched successfully',
      data: wishlistItems
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Failed to fetch wishlist'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check for token in cookies first, then Authorization header
    let token = request.cookies.get('token')?.value;
    if (!token) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Remove 'Bearer ' prefix
      }
    }

    if (!token) {
      const response: ApiResponse = {
        success: false,
        message: 'Authentication required'
      };
      return NextResponse.json(response, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      const response: ApiResponse = {
        success: false,
        message: 'Invalid token'
      };
      return NextResponse.json(response, { status: 401 });
    }

    const { product_id }: { product_id: string } = await request.json();

    if (!product_id) {
      const response: ApiResponse = {
        success: false,
        message: 'Product ID is required'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Check if already in wishlist
    const existing = await prisma.wishlist.findUnique({
      where: {
        user_id_product_id: {
          user_id: decoded.userId,
          product_id: product_id
        }
      }
    });

    if (existing) {
      const response: ApiResponse = {
        success: false,
        message: 'Product is already in your wishlist'
      };
      return NextResponse.json(response, { status: 400 });
    }

    const wishlistItem = await prisma.wishlist.create({
      data: {
        user_id: decoded.userId,
        product_id: product_id
      },
      include: {
        product: true
      }
    });

    const response: ApiResponse = {
      success: true,
      message: 'Product added to wishlist',
      data: wishlistItem
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Failed to add product to wishlist'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check for token in cookies first, then Authorization header
    let token = request.cookies.get('token')?.value;
    if (!token) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Remove 'Bearer ' prefix
      }
    }

    if (!token) {
      const response: ApiResponse = {
        success: false,
        message: 'Authentication required'
      };
      return NextResponse.json(response, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      const response: ApiResponse = {
        success: false,
        message: 'Invalid token'
      };
      return NextResponse.json(response, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      const response: ApiResponse = {
        success: false,
        message: 'Product ID is required'
      };
      return NextResponse.json(response, { status: 400 });
    }

    await prisma.wishlist.delete({
      where: {
        user_id_product_id: {
          user_id: decoded.userId,
          product_id: productId
        }
      }
    });

    const response: ApiResponse = {
      success: true,
      message: 'Product removed from wishlist'
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Failed to remove product from wishlist'
    };
    return NextResponse.json(response, { status: 500 });
  }
}
