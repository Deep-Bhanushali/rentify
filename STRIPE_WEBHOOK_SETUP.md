# Stripe Webhook Setup Guide

This guide will walk you through setting up Stripe webhooks to handle payment events for your Rentify application.

## Why Webhooks Are Important

Webhooks allow Stripe to send real-time notifications to your application when events occur, such as:
- Payment success or failure
- Subscription updates
- Disputes and refunds

For our rental application, webhooks are crucial for:
1. Automatically updating payment status in our database
2. Generating invoices when payments are completed
3. Handling payment failures gracefully
4. Keeping our system in sync with Stripe's records

## Prerequisites

Before setting up webhooks, ensure you have:
1. A Stripe account with API keys configured in your `.env` file
2. Your application deployed to a public URL (or using a tunnel like ngrok for development)
3. The Stripe webhook endpoint implemented at `/api/stripe-webhook`

## Setting Up Webhooks in Stripe Dashboard

### Step 1: Access Webhooks Settings

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers** → **Webhooks**
3. Click "Add an endpoint"

### Step 2: Configure Webhook Endpoint

1. **Endpoint URL**: Enter the full URL to your webhook endpoint
   - Production: `https://yourdomain.com/api/stripe-webhook`
   - Development: Use a tool like ngrok to expose your local server

2. **Select events to listen for**: Choose the following events:
   - `payment_intent.succeeded` - When a payment is completed successfully
   - `payment_intent.payment_failed` - When a payment fails
   - `charge.refunded` - When a refund is issued (optional)
   - `charge.dispute.created` - When a dispute is opened (optional)

3. **Click "Add endpoint"**

### Step 3: Configure Webhook Signing Secret

After creating the endpoint, Stripe will display a "Signing Secret". This is used to verify that webhook requests are genuinely from Stripe.

1. Copy the signing secret (it starts with `whsec_`)
2. Add it to your `.env` file as `STRIPE_WEBHOOK_SECRET`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
   ```
3. Restart your application to load the new environment variable

## Testing Webhooks

### Using Stripe CLI (Recommended)

The Stripe CLI is the best way to test webhooks during development:

1. [Install the Stripe CLI](https://stripe.com/docs/stripe-cli)
2. Log in to your Stripe account: `stripe login`
3. Forward events to your local server:
   ```
   stripe listen --forward-to localhost:3000/api/stripe-webhook
   ```
4. The CLI will display a webhook signing secret. Use this for local testing.
5. Trigger test events:
   ```
   stripe trigger payment_intent.succeeded
   stripe trigger payment_intent.payment_failed
   ```

### Using Stripe Dashboard

1. In your webhook endpoint settings, click the "..." menu and select "Send test webhook"
2. Select an event type (e.g., "payment_intent.succeeded")
3. Click "Send test webhook"
4. Check your application logs to verify the webhook was received and processed correctly

## Production Deployment

When deploying to production:

1. Update your webhook endpoint URL to your production domain
2. Test the webhook in your production environment
3. Ensure your server can handle webhook events reliably
4. Set up monitoring for webhook failures

## Security Considerations

1. **Always verify webhook signatures** - Your implementation should verify that each webhook request is genuinely from Stripe using the signing secret.

2. **Use HTTPS** - Webhook endpoints must use HTTPS to protect data in transit.

3. **Idempotency** - Design your webhook handlers to be idempotent, meaning they can safely process the same event multiple times.

4. **Error handling** - Implement proper error handling and logging for webhook events.

5. **Rate limiting** - Consider implementing rate limiting to protect against webhook floods.

## Troubleshooting

### Webhooks Not Being Received

1. Check that your endpoint URL is correct and accessible
2. Verify your server is running and not blocking requests
3. Check your server logs for incoming requests
4. Ensure your firewall or security group allows inbound requests

### Signature Verification Failures

1. Verify you're using the correct signing secret
2. Check that you're using the raw request body for signature verification (not parsed JSON)
3. Ensure you're using the correct algorithm (Stripe uses HMAC-SHA256)

### Event Processing Errors

1. Check your application logs for error messages
2. Verify your database connections and queries
3. Ensure your application has the necessary permissions to update records

## Monitoring Webhooks

Set up monitoring to track:
1. Webhook receipt success/failure rates
2. Event processing times
3. Error rates by event type
4. System health during high webhook volumes

## Additional Resources

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks/guides)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)

## Summary

Setting up webhooks is a critical step for ensuring your payment system works reliably. By following this guide, you'll have a robust webhook implementation that keeps your application in sync with Stripe's payment events.