'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RentalRequest } from '@/types/models';

interface RentalRequestStatusProps {
  rentalRequest: RentalRequest;
  isOwner?: boolean;
  onUpdateStatus?: (status: 'accepted' | 'rejected' | 'completed' | 'cancelled') => void;
}

interface StatusHistoryItem {
  status: string;
  date: Date;
  description: string;
}

export default function RentalRequestStatus({
  rentalRequest,
  isOwner = false,
  onUpdateStatus
}: RentalRequestStatusProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate status history based on current status
  const getStatusHistory = (): StatusHistoryItem[] => {
    const history: StatusHistoryItem[] = [
      {
        status: 'pending',
        date: rentalRequest.created_at,
        description: 'Rental request submitted'
      }
    ];

    if (rentalRequest.status !== 'pending') {
      history.push({
        status: rentalRequest.status,
        date: new Date(), // In a real app, this would come from the database
        description: `Request ${rentalRequest.status}`
      });
    }

    return history;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'accepted':
        return (
          <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'rejected':
        return (
          <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'completed':
        return (
          <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'cancelled':
        return (
          <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  // Get next steps based on current status
  const getNextSteps = () => {
    switch (rentalRequest.status) {
      case 'pending':
        return isOwner 
          ? 'Waiting for your response. Please accept or reject this request.'
          : 'Waiting for the owner to respond to your request.';
      case 'accepted':
        return 'Request has been accepted. Please proceed with payment if required.';
      case 'rejected':
        return 'Request has been rejected by the owner.';
      case 'completed':
        return 'Rental period has been completed successfully.';
      case 'cancelled':
        return 'Request has been cancelled.';
      default:
        return 'No further actions required.';
    }
  };

  // Handle status update
  const handleStatusUpdate = async (status: 'accepted' | 'rejected' | 'completed' | 'cancelled') => {
    if (!onUpdateStatus) return;
    
    setIsUpdating(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/rental-requests/${rentalRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to update rental request');
      }
      
      onUpdateStatus(status);
      
      // If the request was accepted and the user is the owner, redirect to the checkout page
      if (status === 'accepted' && isOwner) {
        setTimeout(() => {
          router.push(`/checkout?rental_request_id=${rentalRequest.id}`);
        }, 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusHistory = getStatusHistory();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Status</h3>
      
      {/* Current Status */}
      <div className="mb-6">
        <div className="flex items-center">
          <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${getStatusColor(rentalRequest.status).replace('text-', 'bg-').replace('100', '200')}`}>
            {getStatusIcon(rentalRequest.status)}
          </div>
          <div className="ml-4">
            <h4 className="text-lg font-medium text-gray-900">
              {rentalRequest.status.charAt(0).toUpperCase() + rentalRequest.status.slice(1)}
            </h4>
            <p className="text-sm text-gray-500">
              {getNextSteps()}
            </p>
          </div>
        </div>
      </div>
      
      {/* Status History Timeline */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-900 mb-3">Status History</h4>
        <div className="flow-root">
          <ul className="-mb-8">
            {statusHistory.map((item, index) => (
              <li key={index}>
                <div className="relative pb-8">
                  {index !== statusHistory.length - 1 && (
                    <span
                      className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative flex space-x-3">
                    <div>
                      <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${getStatusColor(item.status).replace('text-', 'bg-').replace('100', '200')}`}>
                        {getStatusIcon(item.status)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                      <div>
                        <p className="text-sm text-gray-900 font-medium">
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </p>
                        <p className="text-sm text-gray-500">{item.description}</p>
                      </div>
                      <div className="text-right text-sm whitespace-nowrap text-gray-500">
                        {formatDate(item.date)}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      {/* Status Update Actions */}
      {isOwner && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-md font-medium text-gray-900 mb-3">Update Status</h4>
          
          {error && (
            <div className="mb-3 p-3 bg-red-50 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div className="flex flex-wrap gap-2">
            {rentalRequest.status === 'pending' && (
              <>
                <button
                  type="button"
                  onClick={() => handleStatusUpdate('accepted')}
                  disabled={isUpdating}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {isUpdating ? 'Processing...' : 'Accept Request'}
                </button>
                
                <button
                  type="button"
                  onClick={() => handleStatusUpdate('rejected')}
                  disabled={isUpdating}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {isUpdating ? 'Processing...' : 'Reject Request'}
                </button>
              </>
            )}
            
            {rentalRequest.status === 'accepted' && (
              <>
                <button
                  type="button"
                  onClick={() => handleStatusUpdate('completed')}
                  disabled={isUpdating}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isUpdating ? 'Processing...' : 'Mark as Completed'}
                </button>
                
                <button
                  type="button"
                  onClick={() => handleStatusUpdate('cancelled')}
                  disabled={isUpdating}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isUpdating ? 'Processing...' : 'Cancel Request'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}