import { bruteStopper } from 'utils';

const stripe = require('./stripe');


module.exports = (router) => {
  const openPath = '/commerce';
  const securedPath = '/auth/commerce';

  // Brute-force prevention
  bruteStopper(router, `${ securedPath }/create-checkout-session`, { freeRetries: 100 });
  bruteStopper(router, `${ securedPath }/create-portal-session`, { freeRetries: 100 });
  bruteStopper(router, `${ securedPath }/get-checkout-session-status`, { freeRetries: 100 });
  bruteStopper(router, `${ openPath }/stripe/webhook`, { freeRetries: 1000 });

  // Open routes
  // Stripe webhook must use raw body for signature verification
  // Note: The full stripe webhook path is /v1/commerce/stripe/webhook
  router.post(`${ openPath }/stripe/webhook`, stripe.stripeWebhooks);

  // Secured routes
  router.post(`${ securedPath }/create-checkout-session`, stripe.createCheckoutSession);
  router.post(`${ securedPath }/create-portal-session`, stripe.createPortalSession);
  router.get(`${ securedPath }/get-checkout-session-status`, stripe.getCheckoutSessionStatus);

  return router;
};
