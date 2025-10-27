// Shared configuration constants for server-side usage
export const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const getUserRoom = (userId) => `user_${userId}`;
