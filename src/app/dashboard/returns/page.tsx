"use client"

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import type { ProductReturn, DamageAssessment, CreateDamageAssessmentRequest, UpdateDamageAssessmentRequest, CreateDamagePhotoRequest } from '@/types/models';
import DamageAssessmentComponent from '@/components/DamageAssessment';
import { NotificationService } from '@/lib/notifications';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Eye,
  Edit,
  Camera
} from 'lucide-react';

export default function DashboardReturnsPage() {
  const [returns, setReturns] = useState<ProductReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<ProductReturn | null>(null);
  const [showDamageAssessment, setShowDamageAssessment] = useState(false);

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/returns?asOwner=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setReturns(data.data);
        }
      } else {
        setError('Failed to fetch returns');
      }
    } catch (err) {
      console.error('Error fetching returns:', err);
      setError('Failed to load returns');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDamageAssessment = async (assessment: CreateDamageAssessmentRequest | UpdateDamageAssessmentRequest) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      let response;
      if ('product_return_id' in assessment && !selectedReturn?.damageAssessment) {
        // Create new assessment - invoice will be created by the API endpoint
        response = await fetch(`/api/returns/${selectedReturn?.id}/damage-assessment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(assessment),
        });
      } else {
        // Update existing assessment - invoice will be handled by the API endpoint
        response = await fetch(`/api/damage-assessments/${selectedReturn?.damageAssessment?.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(assessment),
        });
      }

      if (response.ok) {
        // Get the assessment result
        const result = await response.json();
        console.log('Assessment saved:', result);

        // The API endpoint now handles all invoice creation logic
        // No need to create invoices here as it's done in the API

        await fetchReturns();
        setShowDamageAssessment(false);
        setSelectedReturn(null);

        // Show success message
        if (result.data?.estimated_cost > 0) {
          console.log(`Invoice will be generated for $${result.data.estimated_cost}`);
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to save assessment:', errorText);
        setError('Failed to save damage assessment');
      }
    } catch (err) {
      console.error('Error saving damage assessment:', err);
      setError('Failed to save damage assessment');
    }
  };

  const handleAddPhoto = async (photo: CreateDamagePhotoRequest) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch('/api/damage-photos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(photo),
      });

      if (!response.ok) {
        setError('Failed to add photo');
      }
    } catch (err) {
      console.error('Error adding photo:', err);
      setError('Failed to add photo');
    }
  };

  const handleRemovePhoto = async (photoId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(`/api/damage-photos/${photoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setError('Failed to remove photo');
      }
    } catch (err) {
      console.error('Error removing photo:', err);
      setError('Failed to remove photo');
    }
  };

  const handleConfirmReturn = async (returnItem: ProductReturn) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      // First confirm the return
      const returnResponse = await fetch(`/api/returns/${returnItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          return_status: 'completed',
          owner_confirmation: true,
        }),
      });

      if (!returnResponse.ok) {
        setError('Failed to confirm return');
        return;
      }

      // Then update the rental request to completed and product to available
      if (returnItem.rental_request_id) {
        const rentalResponse = await fetch(`/api/rental-requests/${returnItem.rental_request_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: 'completed',
          }),
        });

        if (rentalResponse.ok && returnItem.rentalRequest) {
          // Notify the customer that the return is confirmed
          await NotificationService.notifyReturnConfirmed(returnItem.rentalRequest);
          console.log(`Return confirmation notification sent to customer: ${returnItem.rentalRequest.customer.email}`);
        }
      }

      await fetchReturns();
    } catch (err) {
      console.error('Error confirming return:', err);
      setError('Failed to confirm return');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'initiated':
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'initiated':
        return 'Initiated';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'initiated':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Page header skeleton */}
          <div>
            <div className="h-6 bg-gray-300 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64"></div>
          </div>

          {/* Returns list skeleton */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md animate-pulse">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <div className="h-5 bg-gray-300 rounded w-48 mb-1"></div>
              <div className="h-4 bg-gray-200 rounded w-80"></div>
            </div>

            <ul className="divide-y divide-gray-200">
              {Array.from({ length: 4 }, (_, i) => (
                <li key={i}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-5 h-5 bg-gray-300 rounded mr-4"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-300 rounded w-32 mb-1"></div>
                          <div className="h-3 bg-gray-200 rounded w-24 mb-1"></div>
                          <div className="h-3 bg-gray-200 rounded w-32"></div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                        <div className="flex space-x-2">
                          <div className="h-8 bg-gray-300 rounded w-24"></div>
                          <div className="h-8 bg-gray-200 rounded w-28"></div>
                        </div>
                      </div>
                    </div>

                    {/* Damage assessment skeleton */}
                    {i % 2 === 0 && (
                      <div className="mt-4 ml-10 pl-4 border-l-2 border-gray-200">
                        <div className="space-y-1">
                          <div className="h-3 bg-gray-200 rounded w-32"></div>
                          <div className="h-3 bg-gray-200 rounded w-28"></div>
                          <div className="h-3 bg-gray-200 rounded w-36"></div>
                          <div className="h-3 bg-gray-200 rounded w-24"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={fetchReturns}
                  className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <span className="sr-only">Retry</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Returns Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage product returns and damage assessments
          </p>
        </div>

        {showDamageAssessment && selectedReturn && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Damage Assessment</h2>
              <button
                onClick={() => {
                  setShowDamageAssessment(false);
                  setSelectedReturn(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <DamageAssessmentComponent
              productReturnId={selectedReturn.id}
              damageAssessment={selectedReturn.damageAssessment}
              onSave={handleSaveDamageAssessment}
              onAddPhoto={handleAddPhoto}
              onRemovePhoto={handleRemovePhoto}
              editable={true}
            />
          </div>
        )}

        {!showDamageAssessment && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Product Returns</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                List of all product returns that require your attention
              </p>
            </div>
            
            {returns.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No returns to manage</h3>
                <p className="mt-1 text-sm text-gray-500">
                  You don't have any product returns that require attention.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {returns.map((returnItem) => (
                  <li key={returnItem.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="min-w-0 flex-1 flex items-center">
                            <div className="flex-shrink-0">
                              {getStatusIcon(returnItem.return_status)}
                            </div>
                            <div className="min-w-0 flex-1 px-4">
                              <div>
                                <p className="text-sm font-medium text-blue-600 truncate">
                                  {returnItem.rentalRequest?.product?.title}
                                </p>
                                <p className="mt-1 flex items-center text-sm text-gray-500">
                                  <span className="truncate">
                                    Customer: {returnItem.rentalRequest?.customer?.name || 'Unknown'}
                                  </span>
                                </p>
                                <p className="mt-1 flex items-center text-sm text-gray-500">
                                  <span className="truncate">
                                    Return Date: {new Date(returnItem.return_date).toLocaleDateString()}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(returnItem.return_status)}`}>
                              {getStatusText(returnItem.return_status)}
                            </span>
                            <div className="flex space-x-2">
                              {returnItem.return_status !== 'completed' && (
                                <button
                                  onClick={async () => {
                                    if (!returnItem.damageAssessment) {
                                      // Create damage assessment first
                                      try {
                                        const token = localStorage.getItem('token');
                                        const createAssessmentResponse = await fetch(`/api/returns/${returnItem.id}/damage-assessment`, {
                                          method: 'POST',
                                          headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${token}`
                                          },
                                          body: JSON.stringify({
                                            damage_type: 'none',
                                            severity: 'minor',
                                            description: 'Initial damage assessment',
                                            estimated_cost: 0,
                                            approved: false
                                          })
                                        });

                                        if (createAssessmentResponse.ok) {
                                          const newAssessment = await createAssessmentResponse.json();
                                          // Update the return item locally with the new assessment
                                          setSelectedReturn({
                                            ...returnItem,
                                            damageAssessment: newAssessment.data
                                          });

                                          // If damage assessment has estimated cost, create invoice
                                          if (newAssessment.data.estimated_cost > 0) {
                                            try {
                                              const token = localStorage.getItem('token');
                                              const invoiceResponse = await fetch('/api/invoices', {
                                                method: 'POST',
                                                headers: {
                                                  'Content-Type': 'application/json',
                                                  'Authorization': `Bearer ${token}`
                                                },
                                                body: JSON.stringify({
                                                  rental_request_id: returnItem.rental_request_id,
                                                  due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
                                                  notes: `Damage assessment fee: ${newAssessment.data.description}`
                                                })
                                              });

                                              if (invoiceResponse.ok) {
                                                // Add invoice items for damage fee
                                                const invoiceResult = await invoiceResponse.json();
                                                await fetch('/api/invoices/items', {
                                                  method: 'POST',
                                                  headers: {
                                                    'Content-Type': 'application/json',
                                                    'Authorization': `Bearer ${token}`
                                                  },
                                                  body: JSON.stringify({
                                                    invoice_id: invoiceResult.data.id,
                                                    description: newAssessment.data.description || 'Damage assessment fee',
                                                    quantity: 1,
                                                    unit_price: newAssessment.data.estimated_cost,
                                                    item_type: 'damage_fee'
                                                  })
                                                });
                                              }
                                            } catch (invoiceError) {
                                              console.error('Failed to create damage invoice:', invoiceError);
                                            }
                                          }
                                        }
                                      } catch (error) {
                                        console.error('Failed to create damage assessment:', error);
                                        setError('Failed to create damage assessment');
                                        return;
                                      }
                                    }

                                    setSelectedReturn(returnItem);
                                    setShowDamageAssessment(true);
                                  }}
                                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                  <Camera className="h-3 w-3 mr-1" />
                                  {returnItem.damageAssessment ? 'Edit Assessment' : 'Assess Damage'}
                                </button>
                              )}

                              {returnItem.return_status !== 'completed' && (
                                <button
                                  onClick={() => handleConfirmReturn(returnItem)}
                                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                >
                                  Confirm Return
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {returnItem.damageAssessment && (
                          <div className="mt-4 ml-10 pl-4 border-l-2 border-gray-200">
                            <div className="text-sm text-gray-700">
                              <p>
                                <span className="font-medium">Damage Type:</span> {returnItem.damageAssessment.damage_type}
                              </p>
                              <p>
                                <span className="font-medium">Severity:</span> {returnItem.damageAssessment.severity}
                              </p>
                              <p>
                                <span className="font-medium">Estimated Cost:</span> ${returnItem.damageAssessment.estimated_cost.toFixed(2)}
                              </p>
                              <p>
                                <span className="font-medium">Status:</span>{' '}
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  returnItem.damageAssessment.approved 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {returnItem.damageAssessment.approved ? 'Approved' : 'Pending Approval'}
                                </span>
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
