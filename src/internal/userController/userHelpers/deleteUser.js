import { transaction } from 'objection';
import User from 'knex/models/User';
import {
  allowValidUUID,
} from 'utils';
import { retrieveUser } from './retrieveUser';
import { removeCron } from 'internal/cron';
import stripeLib from 'stripe';
import {
  unlinkHabiticaUser,
} from 'internal/habitica';

let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new stripeLib(process.env.STRIPE_SECRET_KEY);
}


// -- ERROR CODES --
// INCORRECT_INSERT_DATA, UNPROVIDED_PASSWORD
export async function deleteUser(userId, req, res) {
  if (!allowValidUUID(userId, req, res)) { return; }

  const userToDelete = await retrieveUser({
    id: userId,
    eager: {
      crons: true,
    },
    eagerSelects: [
      [ 'crons', [ 'id' ]],
    ],
  });

  await unlinkHabiticaUser({ user_id: userId, shouldNotify: false });

  try {
    await transaction(User.knex(), async (trx) => {
      // Unrelates (Unrelate instead of deleting, when possible):
      await userToDelete.$relatedQuery('articles', trx).unrelate();
      await userToDelete.$relatedQuery('groups', trx).unrelate();
      await userToDelete.$relatedQuery('permissions', trx).unrelate();
      await userToDelete.$relatedQuery('analytics', trx).unrelate();
      await userToDelete.$relatedQuery('errors', trx).unrelate();
      await userToDelete.$relatedQuery('feedbacks', trx).unrelate();
    
      // Deletes:
      await userToDelete.$relatedQuery('password', trx).delete();
      await userToDelete.$relatedQuery('user_subscriptions', trx).delete();
      await userToDelete.$relatedQuery('associated_confirmations', trx).delete();
      await userToDelete.$relatedQuery('requested_confirmations', trx).delete();
      await userToDelete.$relatedQuery('crons', trx).delete();
      await userToDelete.$relatedQuery('webhooks', trx).delete();
      await userToDelete.$relatedQuery('event_messages', trx).delete();
  
      await userToDelete.$query(trx).delete();
    });

    userToDelete?.crons?.forEach?.((cron) => {
      removeCron(cron?.id);
    });
  
    try {
      if (userToDelete?.stripe_customer_id) {
        await stripe.customers.del(userToDelete.stripe_customer_id);
      }
    } catch { /**/ }

    res.send(userToDelete);
    return userToDelete;
  } catch (err) {
    throw [ err, 'users.deleteUser' ];
  }
}
