'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Product } from '@/types/models';
import { createRentalRequestSchema } from '@/lib/validations';

  // Extended schema with rental period for rental request creation
const rentalRequestFormSchema = createRentalRequestSchema.safeExtend({
  rental_period: z.enum(['hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
});

type RentalRequestFormData = z.infer<typeof rentalRequestFormSchema>;

interface RentalRequestFormProps {
  product: Product;
  onSuccess?: () => void;
}

export default function RentalRequestForm({ product, onSuccess }: RentalRequestFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<RentalRequestFormData>({
    product_id: product.id,
    start_date: new Date(),
    end_date: new Date(new Date().setDate(new Date().getDate() + 1)),
    pickup_location: product.location,
    return_location: product.location,
    rental_period: 'daily',
  });


  
  const [errors, setErrors] = useState<Record<string, string>>({});



  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Convert date strings to Date objects
    let parsedValue: string | Date = value;
    if (name === 'start_date' || name === 'end_date') {
      parsedValue = new Date(value);
    }

    const newFormData = {
      ...formData,
      [name]: parsedValue
    };

    // Auto-calculate end date based on rental period when start date or period changes
    if (name === 'start_date' || name === 'rental_period') {
      const startDate = name === 'start_date'
        ? new Date(value)
        : formData.start_date instanceof Date
          ? formData.start_date
          : new Date();

      let daysToAdd = 1; // default

      switch (newFormData.rental_period) {
        case 'daily':
          daysToAdd = 1;
          break;
        case 'weekly':
          daysToAdd = 7;
          break;
        case 'monthly':
          daysToAdd = 30;
          break;
        case 'quarterly':
          daysToAdd = 90;
          break;
        case 'yearly':
          daysToAdd = 365;
          break;
      }

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + daysToAdd);
      newFormData.end_date = endDate;
    }

    setFormData(newFormData);

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Validate form
  const validateForm = () => {
    try {
      rentalRequestFormSchema.parse(formData);
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.issues.forEach((issue: z.ZodIssue) => {
          if (issue.path.length > 0) {
            newErrors[issue.path[0].toString()] = issue.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };
  // Handle form submission - create rental request directly (server will calculate amounts)
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Send only raw data - server calculates price and rental period
      const rentalRequestResponse = await fetch('/api/rental-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      const rentalResult = await rentalRequestResponse.json();

      if (!rentalRequestResponse.ok || !rentalResult.success) {
        throw new Error(rentalResult.message || 'Failed to create rental request');
      }

      const rentalRequestId = rentalResult.data.id;

      // Immediately create invoice for the rental request
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const invoiceResponse = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          rental_request_id: rentalRequestId,
          due_date: dueDate.toISOString().split('T')[0],
          notes: `Rental from ${new Date(formData.start_date).toLocaleDateString()} to ${new Date(formData.end_date).toLocaleDateString()}`
        }),
      });

      const invoiceResult = await invoiceResponse.json();

      if (!invoiceResponse.ok || !invoiceResult.success) {
        throw new Error(invoiceResult.message || 'Failed to create invoice');
      }

      // Redirect to the invoice page
      router.push(`/invoices/${invoiceResult.data.id}`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Rent Now</h3>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Rental Period */}
        <div>
          <label htmlFor="rental_period" className="block text-sm font-medium text-gray-700 mb-1">
            Rental Period
          </label>
          <select
            id="rental_period"
            name="rental_period"
            value={formData.rental_period}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="daily">Day</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
          {errors.rental_period && (
            <p className="mt-1 text-sm text-red-600">{errors.rental_period}</p>
          )}
        </div>
        
        {/* Start Date */}
        <div>
          <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            id="start_date"
            name="start_date"
            value={formData.start_date instanceof Date ? formData.start_date.toISOString().split('T')[0] : ''}
            onChange={handleInputChange}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.start_date && (
            <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>
          )}
        </div>
        
        {/* End Date */}
        <div>
          <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            id="end_date"
            name="end_date"
            value={formData.end_date instanceof Date ? formData.end_date.toISOString().split('T')[0] : ''}
            onChange={handleInputChange}
            min={formData.start_date instanceof Date ? new Date(new Date(formData.start_date).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.end_date && (
            <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>
          )}
        </div>
        
        {/* Pickup Location */}
        <div>
          <label htmlFor="pickup_location" className="block text-sm font-medium text-gray-700 mb-1">
            Pickup Location
          </label>
          <input
            type="text"
            id="pickup_location"
            name="pickup_location"
            value={formData.pickup_location}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.pickup_location && (
            <p className="mt-1 text-sm text-red-600">{errors.pickup_location}</p>
          )}
        </div>
        
        {/* Return Location */}
        <div>
          <label htmlFor="return_location" className="block text-sm font-medium text-gray-700 mb-1">
            Return Location
          </label>
          <input
            type="text"
            id="return_location"
            name="return_location"
            value={formData.return_location}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.return_location && (
            <p className="mt-1 text-sm text-red-600">{errors.return_location}</p>
          )}
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
          >
            {isSubmitting ? 'Processing...' : 'Rent Now'}
            
          </button>
        </div>
      </form>
    </div>
  );
}
