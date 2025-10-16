/**
 * Error handler utility for consistent error responses
 */

// Type definitions for Express.js types
interface Request {
  headers: Record<string, string>;
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  query?: Record<string, string>;
}

interface Response {
  status(code: number): Response;
  json(data: Record<string, unknown>): Response;
}

interface NextFunction {
  (err?: Error): void;
}

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const catchAsync = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

export const sendError = (res: Response, error: Error) => {
  let statusCode = 500;
  let message = 'Internal Server Error';

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = error.message;
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again.';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your token has expired. Please log in again.';
  }

  // Log error for debugging
  console.error('Error:', error);

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

// Security utility functions
export const sanitizeInput = (input: string): string => {
  // Remove potentially dangerous characters
  return input.replace(/[<>]/g, '');
};

export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePassword = (password: string): boolean => {
  // Password should be at least 8 characters long
  return password.length >= 8;
};

export const generateRandomToken = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

// Rate limiting utility (for API routes)
export const rateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
};

// Payment security utilities
export const validatePaymentAmount = (amount: number): boolean => {
  // Amount should be positive and less than a reasonable maximum
  return amount > 0 && amount <= 10000;
};

export const validateRentalDates = (startDate: Date, endDate: Date): boolean => {
  const maxRentalDays = 365; // Maximum rental period of 1 year
  
  // Dates should be valid
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return false;
  }
  
  // Start date should be in the future or today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (startDate < today) {
    return false;
  }
  
  // End date should be after start date
  if (endDate <= startDate) {
    return false;
  }
  
  // Rental period should not exceed maximum
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays <= maxRentalDays;
};

// Webhook security utility
export const verifyWebhookSignature = (payload: string, signature: string, secret: string): boolean => {
  // This is a simplified version - in production, you'd use Stripe's official verification
  try {
    const crypto = require('crypto') as typeof import('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload, 'utf8');
    const digest = hmac.digest('hex');
    return digest === signature;
  } catch (error) {
    console.error('Webhook verification error:', error);
    return false;
  }
};