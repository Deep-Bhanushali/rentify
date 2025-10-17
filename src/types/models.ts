export interface User {
  id: string;
  name: string;
  email: string;
  profile_photo?: string;
}

export interface Product {
  isInWishlist?: boolean;
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  rental_price: number;
  location: string;
  status: string;
  created_at: Date;
  image_url: string[];
  user?: User;
  currentRental?: {
    start_date: Date;
    end_date: Date;
    status: string;
  } | null;
}

export interface CreateProductRequest {
  title: string;
  description?: string;
  category: string;
  rental_price: number;
  location: string;
  status?: 'available' | 'rented' | 'unavailable';
  image_url?: string;
}

export interface UpdateProductRequest {
  title?: string;
  description?: string;
  category?: string;
  rental_price?: number;
  location?: string;
  status?: 'available' | 'rented' | 'unavailable';
  image_url?: string;
}

export interface RentalRequest {
  id: string;
  product_id: string;
  customer_id: string;
  start_date: Date;
  end_date: Date;
  status: string;
  price: number;
  rental_period: number;
  pickup_location: string;
  return_location: string;
  created_at: Date;
  product?: Product;
  customer?: User;
  productReturn?: ProductReturn;
}

export interface CreateRentalRequestRequest {
  product_id: string;
  start_date: Date;
  end_date: Date;
  pickup_location: string;
  return_location: string;
  rental_period: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

export interface UpdateRentalRequestRequest {
  status: 'accepted' | 'rejected' | 'completed' | 'cancelled' | 'returned';
}

export interface Payment {
  id: string;
  rental_request_id: string;
  payment_method: string;
  amount: number;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  transaction_id?: string;
  notes?: string;
  payment_date?: Date;
  created_at: Date;
  rentalRequest?: RentalRequest;
  paymentStatus?: string;
}

export interface CreatePaymentRequest {
  rental_request_id: string;
  payment_method: string;
}

export interface Invoice {
  id: string;
  rental_request_id: string;
  invoice_number: string;
  amount: number;
  tax_rate: number;
  tax_amount: number;
  subtotal: number;
  late_fee: number;
  damage_fee: number;
  additional_charges: number;
  invoice_status: 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  due_date: Date;
  paid_date?: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  rentalRequest?: RentalRequest;
  invoiceItems?: InvoiceItem[];
}

export interface CreateInvoiceRequest {
  rental_request_id: string;
  due_date: Date;
  notes?: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  item_type: 'rental_fee' | 'tax' | 'late_fee' | 'damage_fee' | 'additional_charge';
}

export interface CreateInvoiceItemRequest {
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  item_type: 'rental_fee' | 'tax' | 'late_fee' | 'damage_fee' | 'additional_charge';
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface ProductReturn {
  id: string;
  rental_request_id: string;
  return_date: Date;
  return_location: string;
  return_status: 'initiated' | 'in_progress' | 'completed' | 'cancelled';
  condition_notes?: string;
  customer_signature?: string;
  owner_confirmation: boolean;
  created_at: Date;
  updated_at: Date;
  rentalRequest?: RentalRequest;
  damageAssessment?: DamageAssessment;
}

export interface CreateProductReturnRequest {
  rental_request_id: string;
  return_date: Date;
  return_location: string;
  condition_notes?: string;
  customer_signature?: string;
}

export interface UpdateProductReturnRequest {
  return_status?: 'initiated' | 'in_progress' | 'completed' | 'cancelled';
  condition_notes?: string;
  customer_signature?: string;
  owner_confirmation?: boolean;
}

export interface DamageAssessment {
  id: string;
  product_return_id: string;
  damage_type: string;
  severity: 'minor' | 'moderate' | 'major';
  description: string;
  estimated_cost: number;
  approved: boolean;
  assessed_by: string;
  assessment_date: Date;
  productReturn?: ProductReturn;
  damagePhotos?: DamagePhoto[];
}

export interface CreateDamageAssessmentRequest {
  product_return_id: string;
  damage_type: string;
  severity: 'minor' | 'moderate' | 'major';
  description: string;
  estimated_cost: number;
  assessed_by: string;
}

export interface UpdateDamageAssessmentRequest {
  damage_type?: string;
  severity?: 'minor' | 'moderate' | 'major';
  description?: string;
  estimated_cost?: number;
  approved?: boolean;
}

export interface DamagePhoto {
  id: string;
  damage_assessment_id: string;
  photo_url: string;
  description?: string;
  uploaded_at: Date;
  damageAssessment?: DamageAssessment;
}

export interface CreateDamagePhotoRequest {
  damage_assessment_id: string;
  photo_url: string;
  description?: string;
}
