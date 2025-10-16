'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { createProductSchema } from '@/lib/validations';
import { Product, CreateProductRequest } from '@/types/models';

// Extend the schema to include status for form validation
const productFormSchema = createProductSchema.extend({
  status: z.enum(['available', 'rented', 'unavailable']).optional(),
});

type ProductFormData = z.infer<typeof productFormSchema>;

const PRODUCT_CATEGORIES = [
  'Electronics',
  'Furniture',
  'Tools',
  'Vehicles',
  'Clothing',
  'Sports Equipment',
  'Books',
  'Home Appliances',
  'Musical Instruments',
  'Jewelry',
  'Toys & Games',
  'Office Supplies',
  'Gardening',
  'Art & Craft',
  'Photography',
  'Other'
];

interface ProductFormProps {
  product?: Product;
  isEditing?: boolean;
  onSuccess?: () => void;
}

export default function ProductForm({ product, isEditing = false, onSuccess }: ProductFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Image management state - user can choose URL or file, not both
  const [imageSource, setImageSource] = useState<'url' | 'file'>('file');
  const [imageUrls, setImageUrls] = useState<string[]>((product?.image_url || []).filter(url => url && url.trim()));
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      title: product?.title || '',
      description: product?.description || '',
      category: product?.category || '',
      rental_price: product?.rental_price || 0,
      location: product?.location || '',
      status: (product?.status as 'available' | 'rented' | 'unavailable') || 'available',
    },
  });

  const onSubmit = async (data: ProductFormData) => {
    setIsLoading(true);
    setError(null);

    // Validate image selection for new products or when image source is selected
    if (!isEditing || imageSource === 'file' || imageSource === 'url') {
      if (imageSource === 'file' && imageFiles.length === 0) {
        setError('Please select at least one image file to upload.');
        setIsLoading(false);
        return;
      }
      if (imageSource === 'url' && imageUrls.length === 0) {
        setError('Please enter at least one image URL.');
        setIsLoading(false);
        return;
      }
    }

    // For editing, if no new image is provided, make sure original image exists
    if (isEditing && imageSource === 'file' && imageFiles.length === 0 && (!product?.image_url || product.image_url.length === 0)) {
      setError('Product must have an image. Please select a new image or keep the existing one.');
      setIsLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        setIsLoading(false);
        return;
      }

      const url = isEditing ? `/api/products/${product?.id}` : '/api/products';
      const method = isEditing ? 'PUT' : 'POST';

      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description || '');
      formData.append('category', data.category);
      formData.append('rental_price', data.rental_price.toString());
      formData.append('location', data.location);
      formData.append('image_source', imageSource);

      // Handle images based on source
      if (imageSource === 'file' && imageFiles.length > 0) {
        imageFiles.forEach((file, index) => {
          formData.append(`images`, file);
        });
      } else if (imageSource === 'url' && imageUrls.length > 0) {
        imageUrls.forEach(url => {
          formData.append('image_urls', url);
        });
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        if (isEditing) {
          reset();
          onSuccess?.();
        } else {
          // Redirect to the product detail page
          router.push(`/products/${result.data.id}`);
        }
      } else {
        setError(result.message || 'Failed to save product');
      }
    } catch (err) {
      console.error('Error saving product:', err);
      setError('Failed to save product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          {isEditing ? 'Edit Product' : 'Add New Product'}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {isEditing 
            ? 'Update the product information below.'
            : 'Fill in the details to list your product for rent.'
          }
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Product Title *
            </label>
            <div className="mt-1">
              <input
                type="text"
                id="title"
                required
                {...register('title')}
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                  errors.title ? 'border-red-500' : ''
                }`}
                placeholder="Enter product title"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>
          </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <div className="mt-1">
            <textarea
              id="description"
              rows={4}
              {...register('description')}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Describe your product..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category *
            </label>
            <div className="mt-1">
              <select
                id="category"
                required
                {...register('category')}
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                  errors.category ? 'border-red-500' : ''
                }`}
              >
                <option value="">Select a category</option>
                {PRODUCT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="rental_price" className="block text-sm font-medium text-gray-700">
              Rental Price (per day) *
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                id="rental_price"
                step="0.01"
                min="0.01"
                {...register('rental_price', { valueAsNumber: true })}
                className={`block w-full pl-7 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                  errors.rental_price ? 'border-red-500' : ''
                }`}
                placeholder="0.01"
              />
              {errors.rental_price && (
                <p className="mt-1 text-sm text-red-600">{errors.rental_price.message}</p>
              )}
            </div>
          </div>
        </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
              Location *
            </label>
            <div className="mt-1">
              <input
                type="text"
                id="location"
                required
                {...register('location')}
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                  errors.location ? 'border-red-500' : ''
                }`}
                placeholder="City, State"
              />
              {errors.location && (
                <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
              )}
            </div>
          </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            Status
          </label>
          <div className="mt-1">
            <select
              id="status"
              {...register('status')}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="available">Available</option>
              <option value="rented">Rented</option>
              <option value="unavailable">Unavailable</option>
            </select>
            {errors.status && (
              <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Product Images *
          </label>

          {/* Image Source Selection */}
          <div className="mt-1 mb-4">
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => {
                  setImageSource('file');
                  setImageUrls([]);
                }}
                className={`px-4 py-2 rounded-md border ${
                  imageSource === 'file'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Upload from Device
              </button>
              <button
                type="button"
                onClick={() => {
                  setImageSource('url');
                  setImageFiles([]);
                }}
                className={`px-4 py-2 rounded-md border ${
                  imageSource === 'url'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Image URLs
              </button>
            </div>
          </div>

          {/* File Upload Section */}
          {imageSource === 'file' && (
            <div className="space-y-3">
              {/* Display existing uploaded files */}
              {imageFiles.map((file, index) => (
                <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-md">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Preview ${index + 1}`}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImageFiles(prev => prev.filter((_, i) => i !== index))}
                    className="text-red-600 hover:text-red-800"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}

              {/* Upload new files */}
              <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                    >
                      <span>Add more images</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        multiple
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            const newFiles = Array.from(e.target.files);
                            setImageFiles(prev => [...prev, ...newFiles]);
                            e.target.value = ''; // Reset input
                          }
                        }}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB each</p>
                  <p className="text-xs text-gray-400">You can upload multiple images</p>
                </div>
              </div>
            </div>
          )}

          {/* URL Input Section */}
          {imageSource === 'url' && (
            <div className="space-y-3">
              {/* Display existing URLs */}
              {imageUrls.map((url, index) => (
                <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-md">
                  {url ? (
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="w-16 h-16 object-cover rounded"
                      onError={() => {
                        // If image fails to load, show error
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => {
                        const newUrls = [...imageUrls];
                        newUrls[index] = e.target.value;
                        setImageUrls(newUrls);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter image URL"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setImageUrls(prev => prev.filter((_, i) => i !== index))}
                    className="text-red-600 hover:text-red-800"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}

              {/* Add new URL */}
              <div className="flex items-center space-x-2">
                <input
                  type="url"
                  placeholder="Enter image URL (e.g., https://example.com/image.jpg)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const input = e.target as HTMLInputElement;
                      if (input.value) {
                        setImageUrls(prev => [...prev, input.value]);
                        input.value = '';
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                    const newUrl = input.value.trim();
                    if (newUrl && !imageUrls.includes(newUrl)) {
                      setImageUrls(prev => [...prev, newUrl]);
                    }
                    input.value = '';
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Add
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Press Enter or click Add to include the URL. Make sure URLs are accessible and point to valid images.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              isEditing ? 'Update Product' : 'Create Product'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
