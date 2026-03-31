
export const stripeWebhookCustomerCreated = ({ eventData, userObj }) => {
  // Check if the stripe_customer_id doesn't exist on a user, if not, check if the user matching
  // the email has a cus_id. If not, then attach this stripe_customer_id to the user:
  if (!userObj) {
    throw [ new Error(`A user was created on Stripe, but does not exist in the database: ${ eventData.id }, email: ${ eventData.email }`), 'stripeWebhookCustomerCreated' ];
  }
};