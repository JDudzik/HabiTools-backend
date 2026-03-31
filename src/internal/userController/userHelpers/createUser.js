import User from 'knex/models/User';
import { transaction } from 'objection';
import {
  restrictProperties,
  handleApiAnalytic,
  sha512,
} from 'utils';
import { assignGroupToUser } from '../methods/permissionAssignments/assignGroupToUser';
import deepTrim from 'deep-trim';
import stripeLib from 'stripe';

let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new stripeLib(process.env.STRIPE_SECRET_KEY);
}


// -- ERROR CODES --
// INCORRECT_INSERT_DATA, UNPROVIDED_PASSWORD, PASSWORD_TOO_SHORT, INVALID_EMAIL, EMAIL_ALREADY_EXISTS
export async function createUser(newUserProperties, lessRestictions, req, res) {
  // On any failures, this function will return "false" and automatically send an appropriate error to the client.
  // if it suceeds, It will return the user-object and send NO response

  const properties = restrictProperties(
    deepTrim(newUserProperties),
    lessRestictions
      ? [ 'id', 'created_at', 'deleted_at', 'password', 'groups' ]
      : [ 'id', 'created_at', 'deleted_at', 'password', 'groups', 'has_verified_email' ],
  );

  if (Object.keys(properties).length < 1) {
    if (res) {
      res.status(400);
      res.json({
        status: 'INCORRECT_INSERT_DATA',
        message: 'Request does not contain correct data to insert',
      });
    }
    return false;
  }

  if (!newUserProperties.password) {
    if (res) {
      res.status(400);
      res.json({
        status: 'UNPROVIDED_PASSWORD',
        message: '"password" is a required field',
      });
    }
    return false;
  }

  if (newUserProperties.password.length < 6) {
    if (res) {
      res.status(400);
      res.json({
        status: 'PASSWORD_TOO_SHORT',
        message: 'Password is too short. Must be at least 6 characters',
      });
    }
    return false;
  }


  // Verify that the provided email is valid
  if (typeof properties.email !== 'string') {
    if (res) {
      res.status(400);
      res.json({
        status: 'INVALID_EMAIL',
        message: 'Email provided is invalid',
      });
    }
    return false;
  }

  // eslint-disable-next-line no-control-regex
  const emailRegex = /(?:[a-z0-9!#$%&'*+\x2f=?^_`\x7b-\x7d~\x2d]+(?:\.[a-z0-9!#$%&'*+\x2f=?^_`\x7b-\x7d~\x2d]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9\x2d]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9\x2d]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9\x2d]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/i;
  properties.email = properties.email.toLowerCase();

  if (!emailRegex.test(properties.email)) {
    if (res) {
      res.status(400);
      res.json({
        status: 'INVALID_EMAIL',
        message: 'Email provided is invalid',
      });
    }
    return false;
  }

  let stripeCustomer = undefined;
  if (stripe) {
    stripeCustomer = await stripe.customers.create({
      name: `${ properties.first_name } ${ properties.last_name }`,
      email: properties.email,
    });
  }

  // Process the actual DB request
  const graph = {
    ...properties,
    created_at: Date.now(),
    password: {
      created_at: Date.now(),
      password_hash: sha512(newUserProperties.password),
    },
    stripe_customer_id: stripeCustomer?.id || undefined,
  };

  return await transaction(User.knex(), (trx) => {
    return (
      User.query(trx)
        // For security reasons, limit the relations that can be upserted.
        .allowGraph('[password]')
        .upsertGraph(graph)
    );
  })
    .then((upsertedData) => {
      // If the "groups" array is attached, add the new user to each of those groups
      if (newUserProperties.groups && Array.isArray(newUserProperties.groups)) {
        newUserProperties.groups.forEach((group) => {
          assignGroupToUser(upsertedData.id, group);
        });
      }

      handleApiAnalytic(req, 'created_user', `${ properties.email }`);
      return upsertedData;
    })
    .catch((err) => {
      if (err?.name === 'UniqueViolationError' || err?.errno === 19 || err?.nativeError?.errno === 19) {
        // errno 19 is when an email already exists within the database
        if (res) {
          res.status(409);
          res.json({
            status: 'EMAIL_ALREADY_EXISTS',
            message: 'Email address already exists',
          });
        }
        return false;
      }
      throw [ err, 'users.createUser' ];
    });
}
