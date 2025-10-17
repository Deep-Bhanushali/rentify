import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { updateProductSchema } from '@/lib/validations';
import { Product, UpdateProductRequest, ApiResponse } from '@/types/models';
import { writeFile, mkdir } from 'fs/promises';
import { extname, join } from 'path';
import { revalidateTag } from 'next/cache';

const prisma = new PrismaClient();

interface RouteParams {
  id: string;
}

// GET /api/products/[id] - Get a specific product
export async function GET(request: NextRequest, { params }: { params: Promise<RouteParams> }) {
  try {
    const resolvedParams = await params;
    const product = await prisma.product.findUnique({
      where: { id: resolvedParams.id },
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
          take: 1 
        }
      }
    });

    if (!product) {
      const response: ApiResponse = {
        success: false,
        message: 'Product not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Add current rental information to product
    const productWithRental = {
      ...product,
      currentRental: product.rentalRequests.length > 0 ? {
        start_date: product.rentalRequests[0].start_date,
        end_date: product.rentalRequests[0].end_date,
        status: product.rentalRequests[0].status
      } : null,
      rentalRequests: undefined // Remove raw rentalRequests from output
    };

    const response: ApiResponse<Product> = {
      success: true,
      message: 'Product retrieved successfully',
      data: productWithRental as Product
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Get product error:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to retrieve product'
    };

    return NextResponse.json(response, { status: 500 });
  }
}


// PUT /api/products/[id] - Update product details
export async function PUT(request: NextRequest, { params }: { params: Promise<RouteParams> }) {
  try {
    const resolvedParams = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

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

    // Check if product exists and belongs to the user
    const existingProduct = await prisma.product.findUnique({
      where: { id: resolvedParams.id }
    });

    if (!existingProduct) {
      const response: ApiResponse = {
        success: false,
        message: 'Product not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    if (existingProduct.user_id !== decoded.userId) {
      const response: ApiResponse = {
        success: false,
        message: 'Unauthorized to update this product'
      };
      return NextResponse.json(response, { status: 403 });
    }

    const formData = await request.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const rental_price = parseFloat(formData.get('rental_price') as string);
    const location = formData.get('location') as string;
    const status = formData.get('status') as string;
    const imageSource = formData.get('image_source') as string || 'file';

    // Validate the core data
    const validatedData: any = {};

    if (title) validatedData.title = title;
    if (description !== undefined) validatedData.description = description || null;
    if (category) validatedData.category = category;
    if (!isNaN(rental_price)) validatedData.rental_price = rental_price;
    if (location) validatedData.location = location;
    if (status && ['available', 'rented', 'unavailable'].includes(status)) {
      validatedData.status = status;
    }

    // Handle image updates
    if (imageSource === 'file') {
      // Handle file upload
      const file = formData.get('image');
      if (file instanceof File) {
        try {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);

          // Generate unique filename
          const timestamp = Date.now();
          const ext = '.' + (file.type.split('/')[1] || 'jpg'); // Get extension from MIME type
          const filename = `product_${decoded.userId}_${timestamp}_update${ext}`;
          const uploadPath = join(process.cwd(), 'public', 'uploads', filename);

          // Ensure the uploads directory exists
          await mkdir(join(process.cwd(), 'public', 'uploads'), { recursive: true });

          console.log('Saving updated image to:', uploadPath);

          // Write the file
          await writeFile(uploadPath, buffer);

          // Set the image URL path
          validatedData.image_url = [`/uploads/${filename}`];

          console.log('Image updated successfully:', `/uploads/${filename}`);
        } catch (fileError) {
          console.error('Error saving updated image file:', fileError);
          throw new Error('Failed to save updated image file');
        }
      }
    } else if (imageSource === 'url') {
      // Handle multiple URL inputs
      const imageUrls = formData.getAll('image_urls').map(url => String(url).trim()).filter(url => url);
      if (imageUrls.length > 0) {
        validatedData.image_url = imageUrls;
        console.log('Updated image URLs:', imageUrls);
      }
    }

    // Only update if we have data to update
    if (Object.keys(validatedData).length === 0) {
      const response: ApiResponse = {
        success: false,
        message: 'No valid data provided for update'
      };
      return NextResponse.json(response, { status: 400 });
    }

    const updatedProduct = await prisma.product.update({
      where: { id: resolvedParams.id },
      data: validatedData,
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

    // Revalidate caches when product is updated
    revalidateTag('products');

    const response: ApiResponse<Product> = {
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Update product error:', error);
    
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
      message: 'Failed to update product'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// DELETE /api/products/[id] - Delete a product
export async function DELETE(request: NextRequest, { params }: { params: Promise<RouteParams> }) {
  try {
    const resolvedParams = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

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
        message: 'Invalid token - please login to continue'
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Check if product exists and belongs to the user
    const existingProduct = await prisma.product.findUnique({
      where: { id: resolvedParams.id }
    });

    if (!existingProduct) {
      const response: ApiResponse = {
        success: false,
        message: 'Product not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    if (existingProduct.user_id !== decoded.userId) {
      const response: ApiResponse = {
        success: false,
        message: 'Unauthorized to delete this product'
      };
      return NextResponse.json(response, { status: 403 });
    }

    await prisma.product.delete({
      where: { id: resolvedParams.id }
    });

    // Revalidate caches when product is deleted
    revalidateTag('products');

    const response: ApiResponse = {
      success: true,
      message: 'Product deleted successfully'
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Delete product error:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to delete product'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
