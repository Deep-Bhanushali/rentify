'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RentalRequest, ProductReturn } from '@/types/models';
import Navigation from '@/components/Navigation';
import ReturnConfirmation from '@/components/ReturnConfirmation';

export default function ReturnDetailPage() {
  const [rental, setRental] = useState<RentalRequest | null>(null);
  const [productReturn, setProductReturn] = useState<ProductReturn | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(5);
  
  const params = useParams();
  const router = useRouter();
  const rentalId = params.id as string;

  useEffect(() => {
    fetchReturnDetails();
  }, [rentalId]);

  const fetchReturnDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Please log in to view return details');
      }

      // Fetch rental details
      const rentalResponse = await fetch(`/api/rental-requests/${rentalId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!rentalResponse.ok) {
        if (rentalResponse.status === 401) {
          throw new Error('Session expired. Please log in again.');
        }
        throw new Error('Failed to fetch rental details');
      }
      const rentalData = await rentalResponse.json();
      setRental(rentalData.data);

      // Find the product return for this rental - filter by rental_request_id
      try {
        const returnsResponse = await fetch(`/api/returns?rental_request_id=${rentalId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (returnsResponse.ok) {
          const returnsData = await returnsResponse.json();
          // Take the first (and should be only) return for this rental
          if (returnsData.data && returnsData.data.length > 0) {
            setProductReturn(returnsData.data[0]);
          }
        }
      } catch (err) {
        console.warn('Could not find product return for this rental:', err);
        // This is okay - some rentals might not have returns initiated yet
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleReturnConfirmation = async (signature: string, conditionNotes: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Please log in to confirm return');
      }

      // Only allow creating new return if it doesn't exist
      if (!productReturn) {
        // Create a new return record with status 'initiated'
        const response = await fetch('/api/returns', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            rental_request_id: rentalId,
            return_date: new Date().toISOString().split('T')[0],
            return_location: rental?.return_location || 'Default Location',
            condition_notes: conditionNotes,
            customer_signature: signature,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to initiate return');
        }

        // Submit feedback if provided
        if (feedback.trim()) {
          await fetch('/api/feedback', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              rental_request_id: rentalId,
              rating: rating,
              feedback: feedback.trim(),
            }),
          });
        }

        // Refresh data
        await fetchReturnDetails();
        setShowConfirmation(false);
      } else {
        // Return already exists, just submit feedback if provided
        if (feedback.trim()) {
          await fetch('/api/feedback', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              rental_request_id: rentalId,
              rating: rating,
              feedback: feedback.trim(),
            }),
          });
        }
        setShowConfirmation(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading return details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!rental) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Rental Not Found</h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>The rental you're looking for doesn't exist or you don't have permission to view it.</p>
              </div>
              <div className="mt-5">
                <button
                  onClick={() => router.push('/returns')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Back to Returns
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const returnStatus = productReturn?.return_status || 'not_initiated';
  const returnSteps = [
    { id: 'initiated', name: 'Return Initiated', description: 'Return process has been started' },
    { id: 'in_progress', name: 'In Progress', description: 'Product is being returned' },
    { id: 'completed', name: 'Completed', description: 'Product has been returned successfully' },
  ];

  const currentStepIndex = returnStatus === 'not_initiated' 
    ? -1 
    : returnSteps.findIndex(step => step.id === returnStatus);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Return Details</h1>
            <button
              onClick={() => router.push('/returns')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Returns
            </button>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Rental Information</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Details about the rental being returned</p>
            </div>
            <div className="border-t border-gray-200">
              <dl>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Product</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{rental.product?.title}</dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Rental Period</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {new Date(rental.start_date).toLocaleDateString()} - {new Date(rental.end_date).toLocaleDateString()}
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Pickup Location</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{rental.pickup_location}</dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Return Location</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{rental.return_location}</dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Return Status</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      returnStatus === 'completed' ? 'bg-green-100 text-green-800' :
                      returnStatus === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                      returnStatus === 'initiated' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {returnStatus === 'not_initiated' ? 'Not Initiated' : 
                       returnStatus === 'initiated' ? 'Initiated' :
                       returnStatus === 'in_progress' ? 'In Progress' :
                       returnStatus === 'completed' ? 'Completed' : returnStatus}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Return Process</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Track the progress of your return</p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <nav aria-label="Progress">
                <ol role="list" className="space-y-4 md:flex md:space-y-0 md:space-x-8">
                  {returnSteps.map((step, stepIdx) => (
                    <li key={step.name} className="md:flex-1">
                      <div
                        className={`group flex flex-col border-l-4 py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-10 md:pl-0 md:pt-4 ${
                          stepIdx <= currentStepIndex
                            ? 'border-blue-600'
                            : 'border-gray-200'
                        }`}
                      >
                        <span className={`text-sm font-medium ${
                          stepIdx <= currentStepIndex ? 'text-blue-600' : 'text-gray-500'
                        }`}>
                          {step.name}
                        </span>
                        <span className="text-sm text-gray-500">{step.description}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6 text-gray-600">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Return Instructions</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Please follow these instructions for returning the product</p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <div className="prose prose-sm max-w-none">
                <h4>Return Process</h4>
                <ol>
                  <li>Ensure the product is clean and in the same condition as received</li>
                  <li>Package the product securely to prevent damage during transit</li>
                  <li>Bring the product to the designated return location: {rental.return_location}</li>
                  <li>Present your rental confirmation and ID to the staff</li>
                  <li>Complete the return confirmation form</li>
                  <li>Wait for the owner to inspect the product and confirm the return</li>
                </ol>
                
                <h4>Condition Guidelines</h4>
                <ul>
                  <li>The product should be free from major damage beyond normal wear and tear</li>
                  <li>All accessories and components should be included</li>
                  <li>Any damage should be documented and reported</li>
                  <li>The product should be in working condition unless otherwise specified</li>
                </ul>
                
                <h4>Contact Information</h4>
                <p>If you have any questions about the return process, please contact:</p>
                <p>Email: support@rentify.com<br />
                Phone: +1 (555) 123-4567</p>
              </div>
            </div>
          </div>

          {returnStatus !== 'completed' && !productReturn && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Initiate Return</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Start the return process for this rental</p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                <button
                  onClick={() => setShowConfirmation(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Initiate Return
                </button>
              </div>
            </div>
          )}

          {showConfirmation && (
            <ReturnConfirmation
              rental={rental}
              productReturn={productReturn || undefined}
              onConfirm={handleReturnConfirmation}
              onCancel={() => setShowConfirmation(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
