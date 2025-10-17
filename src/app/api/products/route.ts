import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { createProductSchema } from '@/lib/validations';
import { Product, ApiResponse } from '@/types/models';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { revalidateTag } from 'next/cache';

const prisma = new PrismaClient();

// GET /api/products - List all products available for rent
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const location = searchParams.get('location');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') as string) : undefined;
    const owner = searchParams.get('owner') === 'true';

    const whereClause: Record<string, unknown> = {};

    // If owner parameter is true, we need to authenticate the user
    let currentUserId = null;
    let isAuthenticated = false;

    if (owner) {
      const decoded = getCurrentUser(request);

      if (!decoded) {
        const response: ApiResponse = {
          success: false,
          message: 'Authentication required'
        };
        return NextResponse.json(response, { status: 401 });
      }

      whereClause.user_id = decoded.userId;
      currentUserId = decoded.userId;
      isAuthenticated = true;
    } else {
      // Check if user is authenticated
      const decoded = getCurrentUser(request);
      if (decoded) {
        whereClause.status = { in: ['available', 'rented'] };
        whereClause.user_id = {
          not: decoded.userId
        };
        currentUserId = decoded.userId;
        isAuthenticated = true;
      }
      // For unauthenticated users, show ALL products (no status or user_id filter)
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (category) whereClause.category = { contains: category, mode: 'insensitive' };
    if (location) whereClause.location = { contains: location, mode: 'insensitive' };
    if (minPrice && maxPrice) {
      whereClause.rental_price = {
        gte: parseFloat(minPrice),
        lte: parseFloat(maxPrice)
      };
    } else if (minPrice) {
      whereClause.rental_price = { gte: parseFloat(minPrice) };
    } else if (maxPrice) {
      whereClause.rental_price = { lte: parseFloat(maxPrice) };
    }

    // Fetch products directly without caching to ensure user-specific responses
    let products = await prisma.product.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        rentalRequests: {
          where: {
            status: { in: ['accepted', 'active', 'paid'] }
          },
          select: {
            start_date: true,
            end_date: true,
            status: true
          },
          orderBy: {
            created_at: 'desc'
          },
          take: 1 // Get the most recent active rental
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: limit
    });

    // Add current rental information to products
    products = products.map(product => ({
      ...product,
      currentRental: product.rentalRequests.length > 0 ? {
        start_date: product.rentalRequests[0].start_date,
        end_date: product.rentalRequests[0].end_date,
        status: product.rentalRequests[0].status
      } : null,
      rentalRequests: undefined // Remove the raw rentalRequests from output
    })) as any;

    // Add wishlist info to products if user is authenticated (for public listings)
    const decoded = getCurrentUser(request);
    if (!owner && decoded && products.length > 0) {
      const wishlistItems = await prisma.wishlist.findMany({
        where: { user_id: decoded.userId },
        select: { product_id: true }
      });
      const userWishlistIds = new Set(wishlistItems.map(w => w.product_id));

      products = products.map(product => ({
        ...product,
        isInWishlist: userWishlistIds.has(product.id)
      })) as any;
    } else {
      // Ensure all products have isInWishlist property
      products = products.map(product => ({
        ...product,
        isInWishlist: false
      })) as any;
    }

    const response: ApiResponse<Product[]> = {
      success: true,
      message: 'Products retrieved successfully',
      data: products
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=86400'
      }
    });
  } catch (error: any) {
    console.error('Get products error:', error);

    const response: ApiResponse = {
      success: false,
      message: 'Failed to retrieve products'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// POST /api/products - Add a new product
export async function POST(request: NextRequest) {
    try {
    const decoded = getCurrentUser(request);

    if (!decoded) {
      const response: ApiResponse = {
        success: false,
        message: 'Authentication required'
      };
      return NextResponse.json(response, { status: 401 });
    }

    const formData = await request.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const rental_price = parseFloat(formData.get('rental_price') as string);
    const location = formData.get('location') as string;
    const imageSource = formData.get('image_source') as string || 'file';

    console.log('Form data received:', { title, description, category, rental_price, location, imageSource });

    // Validate the data
    const validatedData = createProductSchema.parse({
      title,
      description: description || undefined,
      category,
      rental_price,
      location,
    });

    let finalImageUrl: string[] = [];

    if (imageSource === 'file') {
      // Handle multiple file uploads
      const files = formData.getAll('images');
      if (files.length === 0) {
        throw new Error('At least one image file is required when using file upload');
      }

      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file instanceof File) {
          try {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            // Generate unique filename
            const timestamp = Date.now() + i; // Add index to ensure unique filenames
            const ext = '.' + (file.type.split('/')[1] || 'jpg'); // Get extension from MIME type
            const filename = `product_${decoded.userId}_${timestamp}${ext}`;
            const uploadPath = join(process.cwd(), 'public', 'uploads', filename);

            // Ensure the uploads directory exists
            await mkdir(join(process.cwd(), 'public', 'uploads'), { recursive: true });

            console.log('Saving image to:', uploadPath);

            // Write the file
            await writeFile(uploadPath, buffer);

            // Set the image URL path
            uploadedUrls.push(`/uploads/${filename}`);

            console.log('Image saved successfully:', `/uploads/${filename}`);
          } catch (fileError) {
            console.error('Error saving image file:', fileError);
            throw new Error('Failed to save one or more image files');
          }
        } else {
          throw new Error('Invalid file format');
        }
      }

      finalImageUrl = uploadedUrls;
    } else if (imageSource === 'url') {
      // Handle multiple URL inputs
      const imageUrls = formData.getAll('image_urls').map(url => String(url).trim()).filter(url => url);
      if (imageUrls.length === 0) {
        throw new Error('At least one image URL is required when using URL input');
      }
      finalImageUrl = imageUrls;
      console.log('Using image URLs:', imageUrls);
    } else {
      throw new Error('Invalid image source');
    }

    const newProduct = await prisma.product.create({
      data: {
        user_id: decoded.userId,
        title: validatedData.title,
        description: validatedData.description || null,
        category: validatedData.category,
        rental_price: validatedData.rental_price,
        location: validatedData.location,
        image_url: finalImageUrl,
        status: 'available'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Revalidate caches when new product is created
    revalidateTag('products');

    const response: ApiResponse<Product> = {
      success: true,
      message: 'Product created successfully',
      data: newProduct
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    console.error('Create product error:', error);

    if (error.name === 'ZodError') {
      const response: ApiResponse = {
        success: false,
        message: 'Validation error',
        data: error.errors
      };
      return NextResponse.json(response, { status: 400 });
    }

    const response: ApiResponse = {
      success: false,
      message: 'Failed to create product'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
