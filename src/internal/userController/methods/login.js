import { handleApiAnalytic } from 'utils';
import {
  detectUserError,
  calculateToken,
} from '../helpers';
import { retrieveUser } from '../userHelpers';
import { createAndAssignStripeCustomer } from 'internal/commerce/core/createAndAssignStripeCustomer';


export async function login(req, res) {
  const email = req.body.email || '';
  const password = req.body.password || '';

  if (email === '' || password === '') {
    handleApiAnalytic(req, 'failed_login', 'Either email or password was blank');
    res.status(401);
    res.json({
      'status': 'INVALID_CREDENTIALS',
      'message': 'Invalid credentials',
    });
    return;
  }

  const user = await retrieveUser({
    email,
    password,
    eager: {
      results: { assessment: true },
      coach: true,
      coached_results: { user: true, assessment: true },
    },
    eagerSelects: [
      [ 'results', [ 'id', 'created_at' ]],
      [ 'results.assessment', [ 'id', 'title', 'description' ]],
      [ 'coached_results', [ 'id', 'created_at' ]],
      [ 'coached_results.user', [ 'first_name', 'last_name', 'email' ]],
      [ 'coached_results.assessment', [ 'title', 'description' ]],
      [ 'coach', [ 'first_name', 'last_name', 'email' ]],
    ],
  });

  const userError = detectUserError(user);
  if (userError) {
    handleApiAnalytic(req, 'failed_login', userError.analyticText);
    res.status(userError.code);
    res.json({
      'status': userError.status,
      'message': userError.message,
    });
    return;
  }

  // If the user doesn't have a Stripe customer ID, create one for them.
  let stripeCustomer = undefined;
  if (!user.stripe_customer_id) {
    stripeCustomer = await createAndAssignStripeCustomer(user.id);
  }

  handleApiAnalytic(req, 'successful_login', `${ user.email }`);
  const { token, expires } = calculateToken(user);
  res.json({
    token,
    expires,
    user: {
      ...user,
      password: undefined,
      stripe_customer_id: stripeCustomer ? stripeCustomer.id : user.stripe_customer_id,
    },
  });

  return;
}
