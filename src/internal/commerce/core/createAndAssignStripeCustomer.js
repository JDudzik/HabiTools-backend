import User from 'knex/models/User';
import stripeLib from 'stripe';
import { retrieveUser } from 'internal/userController/userHelpers/retrieveUser';
import { handleApiAnalytic } from 'utils';

let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new stripeLib(process.env.STRIPE_SECRET_KEY);
}


export const createAndAssignStripeCustomer = async (user_id) => {
  if (!stripe) {
    console.debug('Stripe is not configured. Cannot create Stripe customer.');
    return;
  }
  const user = await retrieveUser({
    id: user_id,
    select: [ 'id', 'stripe_customer_id', 'email', 'first_name', 'last_name' ],
    eager: { permissions: false },
  });

  const stripeCustomer = await stripe.customers.create({
    name: `${ user.first_name } ${ user.last_name }`,
    email: user.email,
  });
  const patchedUser = await User.query().patchAndFetchById(user.id, { stripe_customer_id: stripeCustomer.id });
  handleApiAnalytic(undefined, 'created_stripe_customer', `${ user.email }`);
  
  return patchedUser;
};