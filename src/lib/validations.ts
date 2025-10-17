import { z } from 'zod';

// Product validation schemas
export const createProductSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().optional(),
  category: z.string().trim().min(1, 'Category is required'),
  rental_price: z.number().positive('Rental price must be positive'),
  location: z.string().trim().min(1, 'Location is required'),
  image_url: z.string().optional(),
});

export const updateProductSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(100, 'Title must be less than 100 characters').optional(),
  description: z.string().optional(),
  category: z.string().trim().min(1, 'Category is required').optional(),
  rental_price: z.number().positive('Rental price must be positive').optional(),
  location: z.string().trim().min(1, 'Location is required').optional(),
  status: z.enum(['available', 'rented', 'unavailable']).optional(),
});

// Rental Request validation schemas
export const createRentalRequestSchema = z.object({
  product_id: z.string().min(1, 'Product ID is required'),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  pickup_location: z.string().min(1, 'Pickup location is required'),
  return_location: z.string().min(1, 'Return location is required'),
  rental_period: z.enum(['hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
}).refine((data) => data.start_date < data.end_date, {
  message: 'Start date must be before end date',
  path: ['end_date'],
});

export const updateRentalRequestSchema = z.object({
  status: z.enum(['accepted', 'rejected', 'completed', 'cancelled', 'returned']),
});

// Payment validation schemas
export const createPaymentSchema = z.object({
  rental_request_id: z.string().min(1, 'Rental request ID is required'),
  payment_method: z.string().min(1, 'Payment method is required'),
});

// Invoice validation schemas
export const createInvoiceSchema = z.object({
  rental_request_id: z.string().min(1, 'Rental request ID is required'),
  due_date: z.coerce.date(),
  notes: z.string().optional(),
});

export const updateInvoiceSchema = z.object({
  invoice_status: z.enum(['pending', 'sent', 'paid', 'overdue', 'cancelled']).optional(),
  paid_date: z.date().optional(),
  notes: z.string().optional(),
  late_fee: z.number().min(0).optional(),
  damage_fee: z.number().min(0).optional(),
  additional_charges: z.number().min(0).optional(),
});

export const createInvoiceItemSchema = z.object({
  invoice_id: z.string().min(1, 'Invoice ID is required'),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  unit_price: z.number().min(0, 'Unit price must be non-negative'),
  item_type: z.enum(['rental_fee', 'tax', 'late_fee', 'damage_fee', 'additional_charge']),
});

// Product Return validation schemas
export const createProductReturnSchema = z.object({
  rental_request_id: z.string().min(1, 'Rental request ID is required'),
  return_date: z.coerce.date(),
  return_location: z.string().min(1, 'Return location is required'),
  condition_notes: z.string().optional(),
  customer_signature: z.string().optional()
});

export const updateProductReturnSchema = z.object({
  return_status: z.enum(['initiated', 'in_progress', 'completed', 'cancelled']).optional(),
  condition_notes: z.string().optional(),
  customer_signature: z.string().optional(),
  owner_confirmation: z.boolean().optional(),
});

// Damage Assessment validation schemas
export const createDamageAssessmentSchema = z.object({
  product_return_id: z.string().min(1, 'Product return ID is required'),
  damage_type: z.string().min(1, 'Damage type is required'),
  severity: z.enum(['minor', 'moderate', 'major']),
  description: z.string().min(1, 'Description is required'),
  estimated_cost: z.number().min(0, 'Estimated cost must be non-negative'),
  assessed_by: z.string().optional(), // Optional since we'll set it dynamically
});

export const updateDamageAssessmentSchema = z.object({
  damage_type: z.string().min(1, 'Damage type is required').optional(),
  severity: z.enum(['minor', 'moderate', 'major']).optional(),
  description: z.string().min(1, 'Description is required').optional(),
  estimated_cost: z.number().min(0, 'Estimated cost must be non-negative').optional(),
  approved: z.boolean().optional(),
});

// Damage Photo validation schemas
export const createDamagePhotoSchema = z.object({
  damage_assessment_id: z.string().min(1, 'Damage assessment ID is required'),
  photo_url: z.string().url('Photo URL must be a valid URL'),
  description: z.string().optional(),
});
