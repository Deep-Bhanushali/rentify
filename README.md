# Rentify - Rental Marketplace Platform

A full-featured rental marketplace built with Next.js, featuring product listings, rental requests, payments via Stripe, and comprehensive notifications.

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database
- Gmail account (for email notifications)

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Set up your environment variables in `.env`:
```bash
# Database
DATABASE_URL="your-postgresql-connection-string"

# JWT Secret
JWT_SECRET="your-secret-key"

# Email Configuration (Using Gmail - setup app password)
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"

# Stripe API Keys
STRIPE_SECRET_KEY="your-stripe-secret-key"
STRIPE_PUBLISHABLE_KEY="your-stripe-publishable-key"
STRIPE_WEBHOOK_SECRET="your-stripe-webhook-secret"
```

3. Set up the database:
```bash
npm run prisma:migrate
npm run db:seed
```

4. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Email Setup

**Using Gmail:**
1. Enable 2-factor authentication on your Gmail account
2. Generate an app password: https://support.google.com/accounts/answer/185833
3. Add the app password to your `.env` file as `EMAIL_PASSWORD`

**Email Notifications:**
- New rental requests (to product owners)
- Request approvals/rejections (to customers)
- Payment confirmations (to both parties)
- Return confirmations (to customers)

## Project Structure

- `src/app/` - Next.js App Router pages and API routes
- `src/components/` - Reusable UI components
- `src/lib/` - Utility functions and services
- `prisma/` - Database schema and migrations

## Features

- User authentication and authorization
- Product listings with image galleries
- Rental request management
- Stripe payment integration
- In-app notifications
- Email notifications
- Dashboard analytics
- Invoice generation and management

## Database Schema

Uses Prisma ORM with PostgreSQL. Key models:
- User (customers and product owners)
- Product (rental items)
- RentalRequest (rental bookings)
- Payment (Stripe transactions)
- Notification (in-app alerts)
- Invoice (billing documents)

## API Routes

- Authentication: `/api/auth/login`, `/api/auth/signup`
- Products: `/api/products`
- Rental Requests: `/api/rental-requests`
- Payments: `/api/payments`
- Notifications: `/api/notifications`
- Dashboard: `/api/dashboard/*`

## Deployment

### Vercel Deployment
The easiest way to deploy is using the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

### Environment Variables for Production
Update the following for production:
- `NEXT_PUBLIC_APP_URL` - Your production domain
- `DATABASE_URL` - Production database connection
- Email credentials (consider using SendGrid or similar for production)

## Learn More

To learn more about Next.js, take a look at the following resources:
- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
