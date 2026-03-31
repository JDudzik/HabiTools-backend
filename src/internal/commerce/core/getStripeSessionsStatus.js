import stripeLib from 'stripe';
import {
  sanitizeProperties,
} from 'utils';

let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new stripeLib(process.env.STRIPE_SECRET_KEY);
}

/**
 * Get the status of a Stripe checkout session
 * @param {Object} payload - Payload containing the sessionId
 * @returns {Promise<Object>} - The Stripe session object
 */
export async function getStripeSessionsStatus(payload) {
  if (!stripe) {
    throw new Error('Stripe is not initialized. Please configure it');
  }

  const sanitizedPayload = sanitizeProperties(payload, {
    requiredKeys: [ 'sessionId' ],
    trimPayload: true,
    removeDisallowedKeys: true,
  });
  if (!sanitizedPayload.valid) { return sanitizedPayload.error; }

  const session = await stripe.checkout.sessions.retrieve(sanitizedPayload.properties?.sessionId);

  return {
    status: session.status,
    payment_status: session.payment_status,
    customer_email: session.customer_details.email,
  };
}