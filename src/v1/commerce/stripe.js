import {
  createStripeCheckoutSession,
  createStripePortalSession,
  getStripeSessionsStatus,
  stripeWebhookRouter,
} from 'internal/commerce';
import { getLoggedInUser } from 'internal/userController/userHelpers';


// Create Stripe Checkout Session
//
// -- POST --
// {API_URL}/v1/auth/commerce/create-checkout-session
export const createCheckoutSession = async (req, res) => {
  const loggedInUserId = await getLoggedInUser(req, [ 'id' ]);
  const session = await createStripeCheckoutSession({ ...req.body, user_id: loggedInUserId });
  if (session.code) { return res.status(session.code).send(session.responseContent); }

  return res.status(201).send({ clientSecret: session.client_secret });
};


// Get Stripe Checkout Session Status
//
// -- GET --
// {API_URL}/v1/auth/commerce/get-checkout-session-status
// -- PARAMS --
// session_id: The ID of the Stripe checkout session to retrieve the status for (passed as a query parameter)
export const getCheckoutSessionStatus = async (req, res) => {
  const session = await getStripeSessionsStatus({ sessionId: req.query.session_id });
  if (session?.code) {
    return res.status(session.code).send(session.responseContent);
  }

  return res.status(200).send(session);
};


// Create Stripe Portal Session
//
// -- POST --
// {API_URL}/v1/auth/commerce/create-portal-session
export const createPortalSession = async (req, res) => {
  const loggedInUserId = await getLoggedInUser(req, [ 'id' ]);
  const session = await createStripePortalSession({ ...req.body, user_id: loggedInUserId });
  if (session.code) { return res.status(session.code).send(session.responseContent); }

  return res.status(201).send(session);
};


// Listen for webhooks from stripe
//
// -- POST --
// {API_URL}/v1/commerce/stripe/webhook
export const stripeWebhooks = async (req, res) => {
  await stripeWebhookRouter(
    req.body,
    response => res.status(response.code).send(response.responseContent),
  );
};