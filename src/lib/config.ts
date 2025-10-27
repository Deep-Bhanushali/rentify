// Shared configuration constants
export const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
export const JWT_EXPIRES_IN = '7d';

// Database connection
export const DATABASE_URL = process.env.DATABASE_URL;

// Email configuration
export const EMAIL_SMTP_HOST = process.env.EMAIL_SMTP_HOST;
export const EMAIL_SMTP_PORT = parseInt(process.env.EMAIL_SMTP_PORT || '587');
export const EMAIL_SMTP_USER = process.env.EMAIL_SMTP_USER;
export const EMAIL_SMTP_PASS = process.env.EMAIL_SMTP_PASS;
export const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@rentify.com';

// Stripe configuration
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Application configuration
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const PORT = process.env.PORT || 3000;

// Socket.IO rooms
export const getUserRoom = (userId: string) => `user_${userId}`;
