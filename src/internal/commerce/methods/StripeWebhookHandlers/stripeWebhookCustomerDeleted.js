import User from 'knex/models/User';
import User_Subscription from 'knex/models/User_Subscription';


export const stripeWebhookCustomerDeleted = async ({ userObj }) => {
  if (userObj?.id) {
    await User.query()
      .where('id', userObj?.id)
      .patch({ stripe_customer_id: null });
  
    await User_Subscription.query()
      .where('id', userObj?.id)
      .delete();
  }
};