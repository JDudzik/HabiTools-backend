import stripeLib from 'stripe';
import { sanitizeProperties } from 'utils';
import { retrieveUser } from 'internal/userController';
import { createAndAssignStripeCustomer } from './createAndAssignStripeCustomer';


let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new stripeLib(process.env.STRIPE_SECRET_KEY);
}

/**
 * Create a stripe customer portal session
 * @param {Object} payload - The payload for creating the portal session
 * @param {string} payload.price_id - The ID of the Stripe price to subscribe to
 * @returns {Promise<Object>} The created portal session or an error object
 * @throws Will throw an error if Stripe is not initialized or if the payload is invalid
 */
export async function createStripePortalSession(payload = {}) {
  if (!stripe) {
    throw new Error('Stripe is not initialized. Please configure it');
  }

  const sanitizedPayload = sanitizeProperties(payload, {
    requiredKeys: [ 'user_id' ],
    optionalKeys: [ 'return_url' ],
    removeDisallowedKeys: true,
  });
  if (!sanitizedPayload.valid) { return sanitizedPayload.error; }
  const { user_id, return_url } = sanitizedPayload.properties;

  const user = await retrieveUser({
    id: user_id,
    select: [ 'id', 'stripe_customer_id', 'email', 'first_name', 'last_name' ],
    eager: { permissions: false, user_subscriptions: false },
  });

  let stripeCustomer = undefined;
  if (!user.stripe_customer_id) {
    stripeCustomer = await createAndAssignStripeCustomer(user.id);
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomer ? stripeCustomer.stripe_customer_id : user.stripe_customer_id,
      return_url: return_url ? return_url : `${ process.env.FRONTEND_HOST }/my-account`,
    });
    return session;
  } catch (error) {
    throw [ error, 'createStripePortalSession' ];
  }
}