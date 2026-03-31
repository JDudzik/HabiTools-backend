import stripeLib from 'stripe';
import { sanitizeProperties } from 'utils';
import { retrieveUser } from 'internal/userController';
import { createAndAssignStripeCustomer } from './createAndAssignStripeCustomer';


let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new stripeLib(process.env.STRIPE_SECRET_KEY);
} else {
  console.warn('⚠️  STRIPE_SECRET_KEY is not set. Stripe functionality will be disabled.');
}

/**
 * Create a Stripe checkout session
 * @param {Object} payload - The payload for creating the checkout session
 * @param {string} payload.price_id - The ID of the Stripe price to subscribe to
 * @returns {Promise<Object>} The created checkout session or an error object
 * @throws Will throw an error if Stripe is not initialized or if the payload is invalid
 */
export async function createStripeCheckoutSession(payload = {}) {
  if (!stripe) {
    throw new Error('Stripe is not initialized. Please configure it');
  }

  const sanitizedPayload = sanitizeProperties(payload, {
    requiredKeys: [ 'price_id', 'user_id' ],
    optionalKeys: [ 'return_url' ],
    removeDisallowedKeys: true,
  });
  if (!sanitizedPayload.valid) { return sanitizedPayload.error; }
  const { price_id, user_id, return_url } = sanitizedPayload.properties;

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
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      mode: 'subscription',
      return_url: return_url ? `${ return_url }?session_id={CHECKOUT_SESSION_ID}` : `${ process.env.FRONTEND_HOST }/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      customer: stripeCustomer ? stripeCustomer.stripe_customer_id : user.stripe_customer_id,
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
    });
    return session;
  } catch (error) {
    throw [ error, 'createStripeCheckoutSession' ];
  }
}