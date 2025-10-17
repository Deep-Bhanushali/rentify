'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import { RentalRequest, ProductReturn } from '@/types/models';

interface ReturnConfirmationProps {
  rental: RentalRequest;
  productReturn?: ProductReturn;
  onConfirm: (signature: string, conditionNotes: string) => void;
  onCancel: () => void;
}

export default function ReturnConfirmation({
  rental,
  productReturn,
  onConfirm,
  onCancel,
}: ReturnConfirmationProps) {
  const [signature, setSignature] = useState('');
  const [conditionNotes, setConditionNotes] = useState(productReturn?.condition_notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(5);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signature.trim()) {
      toast.error('Please provide your digital signature');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(signature, conditionNotes);
      
      // Submit feedback if provided
      if (feedback.trim()) {
        const token = localStorage.getItem('token');
        await fetch('/api/feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            rental_request_id: rental.id,
            rating,
            feedback: feedback.trim(),
          }),
        });
      }
    } catch (error) {
      console.error('Error confirming return:', error);
      toast.error('Failed to confirm return. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Confirm Return</h3>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-900 mb-2">Return Details</h4>
            <div className="bg-gray-50 p-4 rounded-md">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Product</dt>
                  <dd className="mt-1 text-sm text-gray-900">{rental.product?.title}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Return Location</dt>
                  <dd className="mt-1 text-sm text-gray-900">{rental.return_location}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Rental Period</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(rental.start_date).toLocaleDateString()} - {new Date(rental.end_date).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Return Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {productReturn?.return_date ? new Date(productReturn.return_date).toLocaleDateString() : new Date().toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="condition-notes" className="block text-sm font-medium text-gray-700">
                Product Condition Notes
              </label>
              <textarea
                id="condition-notes"
                name="condition-notes"
                rows={3}
                value={conditionNotes}
                onChange={(e) => setConditionNotes(e.target.value)}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md"
                placeholder="Describe the condition of the product being returned..."
              />
            </div>

            <div>
              <label htmlFor="signature" className="block text-sm font-medium text-gray-700">
                Digital Signature *
              </label>
              <input
                type="text"
                name="signature"
                id="signature"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md"
                placeholder="Type your full name as digital signature"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                By signing, you confirm that you are returning the product in the condition described above.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rate Your Rental Experience
              </label>
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="text-gray-400 hover:text-yellow-500 focus:outline-none"
                  >
                    <svg
                      className={`h-6 w-6 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-500">{rating} out of 5</span>
              </div>
            </div>

            <div>
              <label htmlFor="feedback" className="block text-sm font-medium text-gray-700">
                Feedback (Optional)
              </label>
              <textarea
                id="feedback"
                name="feedback"
                rows={3}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md"
                placeholder="Share your experience with this rental..."
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-md">
              <h4 className="text-sm font-medium text-blue-800">Next Steps After Return</h4>
              <ul className="mt-2 text-sm text-blue-700 list-disc pl-5 space-y-1">
                <li>The owner will inspect the product and confirm the return</li>
                <li>If any damage is found, the owner will assess and notify you of any charges</li>
                <li>Your rental will be marked as completed in the system</li>
                <li>You will receive a return confirmation email</li>
                <li>Any security deposit will be processed for return</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Confirming...' : 'Confirm Return'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
