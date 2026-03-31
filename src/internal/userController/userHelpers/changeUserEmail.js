import User from 'knex/models/User';
import {
  allowValidUUID,
} from 'utils';
import { retrieveUser } from './retrieveUser';
import stripeLib from 'stripe';

let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new stripeLib(process.env.STRIPE_SECRET_KEY);
}


// -- ERROR CODES --
// INCORRECT_INSERT_DATA, UNPROVIDED_PASSWORD
export async function changeUserEmail(payload, req, res) {
  const { userId, newEmail, password } = payload;
  if (!allowValidUUID(userId, req, res)) { return; }
  const formattedEmail = newEmail.trim().toLowerCase();

  // eslint-disable-next-line no-control-regex
  const emailRegex = /(?:[a-z0-9!#$%&'*+\x2f=?^_`\x7b-\x7d~\x2d]+(?:\.[a-z0-9!#$%&'*+\x2f=?^_`\x7b-\x7d~\x2d]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9\x2d]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9\x2d]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9\x2d]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/i;
  if (!emailRegex.test(formattedEmail)) {
    if (res) {
      res.status(400);
      res.json({
        status: 'INVALID_EMAIL',
        message: 'Email provided is invalid',
      });
    }
    return false;
  }

  const userToChange = await retrieveUser({
    id: userId,
    password,
    eager: {
      crons: true,
    },
    eagerSelects: [
      [ 'crons', [ 'id' ]],
    ],
  });
  if (!userToChange) {
    if (res) {
      res.status(401);
      res.json({
        status: 'INCORRECT_PASSWORD',
        message: 'Incorrect password',
      });
    }
  }

  const emailExists = await retrieveUser({ email: formattedEmail });
  if (emailExists) {
    if (res) {
      res.status(409);
      res.json({
        status: 'EMAIL_ALREADY_EXISTS',
        message: 'Email address already exists',
      });
    }
    return;
  }

  try {
    await User.query()
      .where('id', userId)
      .patch({ email: formattedEmail, has_verified_email: false });

    try {
      if (userToChange?.stripe_customer_id) {
        await stripe.customers.update(userToChange.stripe_customer_id, { email: formattedEmail });
      }
    } catch { /**/ }

    res.send({ success: true });
    return { success: true };
  } catch (err) {
    throw [ err, 'users.changeUserEmail' ];
  }
}
