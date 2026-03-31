import stripeLib from 'stripe';
import express from 'express';
import { handleApiAnalytic } from 'utils';


const WEBHOOK_SIGNING_KEY = process.env.STRIPE_WEBHOOK_SECRET;

if (!WEBHOOK_SIGNING_KEY) {
  console.warn('⚠️  STRIPE_WEBHOOK_SECRET is not set. Stripe webhook functionality will be disabled.');
}

export const stripeWebhookValidator = (req, res, next) => {
  if (!WEBHOOK_SIGNING_KEY) {
    return { code: 500 };
  }

  // Get the signature sent by Stripe
  let signature = undefined;
  express.raw({ type: 'application/json' })(req, res, () => {
    try {
      signature = req.headers['stripe-signature'];
      stripeLib.webhooks.constructEvent(
        req.body,
        signature,
        WEBHOOK_SIGNING_KEY,
      );
    } catch (err) {
      const errorObj = { message: err.message, signature };
      handleApiAnalytic(req, 'stripe_webhook_validator_error', errorObj);
      res.sendStatus(400);
      return;
    }
  });
  next();
};