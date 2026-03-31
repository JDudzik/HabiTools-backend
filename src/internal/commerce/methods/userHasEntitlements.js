import User_Subscription from 'knex/models/User_Subscription';
import { getLoggedInUser } from 'utils';

/**
 * Check if the logged-in user has a specific entitlement.
 * It can check based on multiple criteria: user ID, Stripe customer ID, or the request object itself.
 * @param {Object} req - The request object containing user information
 * @param {Array<string>} entitlements - The list of entitlements to check against
 * @param {boolean} requireAll - Whether all entitlements are required (default: false)
 * @returns {Promise<boolean>} True if the user has the required entitlements, false otherwise
 */
export const userHasEntitlements = async (config = {}) => {
  const { req, userId, stripeCustomerId, entitlements, requireAll } = config;
  let userSubObj = undefined;

  if (stripeCustomerId) {
    userSubObj = await User_Subscription.query()
      .where('stripe_customer_id', stripeCustomerId)
      .first();
  }

  if (userId && !userSubObj) {
    userSubObj = await User_Subscription.query()
      .where('id', userId)
      .first();
  }

  if (req && !userSubObj) {
    const loggedInUserId = await getLoggedInUser(req, [ 'id' ]);
    if (loggedInUserId) {
      userSubObj = await User_Subscription.query()
        .where('id', loggedInUserId)
        .first();
    }
  }

  if (!userSubObj) {
    return false;
  }

  const userEntitlements = userSubObj.entitlements || [];

  if (requireAll) {
    return entitlements.every(entitlement => userEntitlements.includes(entitlement));
  } 
  return entitlements.some(entitlement => userEntitlements.includes(entitlement));
  
};