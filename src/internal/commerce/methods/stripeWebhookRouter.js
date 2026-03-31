import WebhookHandled from 'knex/models/Webhook_Handled';
import User_Subscription from 'knex/models/User_Subscription';
import User from 'knex/models/User';
import {
  stripeWebhookCustomerCreated,
  stripeWebhookCustomerDeleted,
  stripeWebhookCustomerSubscriptionCreated,
  stripeWebhookCustomerSubscriptionDeleted,
  stripeWebhookCustomerSubscriptionUpdated,
  stripeWebhookEntitlementsSummary,
} from './StripeWebhookHandlers';
import { createEventMessage } from '../../eventMessages/core/createEventMessage';

const WEBHOOK_SIGNING_KEY = process.env.STRIPE_WEBHOOK_SECRET;
if (!WEBHOOK_SIGNING_KEY) {
  console.warn('⚠️  STRIPE_WEBHOOK_SECRET is not set. Stripe webhook functionality will be disabled.');
}
const STRIPE_DEBUG_MESSAGES = true;


const handleSaveUserSub = async (updates, stripe_customer_id, eventType) => {
  if (!stripe_customer_id) {
    throw [
      new Error(`No stripe_customer_id provided to saveUserSub. Cannot save user subscription data. event type: ${ eventType }`),
      'stripeWebhookRouter.saveUserSub',
    ];
  }

  const userObj = await User.query()
    .where('stripe_customer_id', stripe_customer_id)
    .withGraphFetched('user_subscriptions')
    .first();

  const userSubObj = userObj?.user_subscriptions?.[0];
  if (!userSubObj && userObj?.id) {
    // If there isn't a user subscription, we want to create one.
    await User_Subscription.query()
      .insert({
        id: userObj?.id,
        stripe_customer_id: stripe_customer_id,
        ...updates,
      });
  } else {
    // If there is a user subscription, we want to update it with the new data.
    await User_Subscription.query()
      .where('stripe_customer_id', stripe_customer_id)
      .patch(updates);
  }
};
  

export const stripeWebhookRouter = async (payload, respond) => {
  const eventType = payload?.type;
  const eventId = payload?.id;
  const eventData = payload?.data?.object;

  // Check if webhook has already been handled:
  const handledRecord = await WebhookHandled.query()
    .where('request_id', eventId)
    .andWhere('request_type', eventType)
    .first();

  if (handledRecord) {
    return respond({
      code: 200,
      responseContent: { received: true, message: 'Webhook event already handled' },
    });
  }

  if (!handledRecord) {
    const { id, api_version, type, request } = payload || {};
    await WebhookHandled.query().insert({
      request_id: eventId,
      request_type: eventType,
      created_at: Date.now(),
      metadata: { id, api_version, type, request },
    });
    respond({
      code: 200,
      responseContent: { received: true, message: 'Webhook event recorded and being processed' },
    });
  }

  let userObj = undefined;
  const customerId = eventData?.customer || (eventData?.object === 'customer' && eventData?.id);
  if (customerId) {
    userObj = await User.query()
      .where('stripe_customer_id', customerId)
      .withGraphFetched('user_subscriptions')
      .first();
  }

  const saveUserSub = async (updates, stripe_customer_id = customerId) => {
    await handleSaveUserSub(updates, stripe_customer_id, eventType);
  };
  
  const stripeEventHandlers = {
    'customer.created': stripeWebhookCustomerCreated,
    'customer.deleted': stripeWebhookCustomerDeleted,
    'customer.subscription.created': stripeWebhookCustomerSubscriptionCreated,
    'customer.subscription.deleted': stripeWebhookCustomerSubscriptionDeleted,
    'customer.subscription.updated': stripeWebhookCustomerSubscriptionUpdated,
    'entitlements.active_entitlement_summary.updated': stripeWebhookEntitlementsSummary,
  };
  if (stripeEventHandlers?.[eventType]) {
    await stripeEventHandlers[eventType]({ eventData, userObj, saveUserSub });
  }


  if (STRIPE_DEBUG_MESSAGES) {
    const loggedUserObj = await User.query()
      .where('stripe_customer_id', customerId)
      .withGraphFetched('user_subscriptions')
      .first();

    await createEventMessage({
      user_id: '00000001-0001-4000-a000-000000000000',
      short_message: `SW: ${ eventType }`,
      should_notify: true,
      priority: 1,
      message_text:
`
### Type: \`${ eventType }\`
\`\`\`
${ JSON.stringify(eventData, null, 2) }
\`\`\`


### User Object:
\`\`\`
${ JSON.stringify(loggedUserObj, null, 2) }
\`\`\`
`,
    });
  }
};
