import { handleApiAnalytic, returnOrSendResponse } from 'utils';
import Email_Confirmation from 'knex/models/Email_Confirmation';

export const getValidConfirmation = async (type, token, req, res) => {
  const confirmationLink = await Email_Confirmation.query()
    .where('type', type)
    .andWhere('token', token)
    .whereNull('deleted_at')
    .first();

  if (!confirmationLink) {
    handleApiAnalytic(req, 'confirmation_invalid', `type: ${ type }, token: ${ token }`);
    return returnOrSendResponse(404, {
      status: 'CONFIRMATION_INVALID',
      message: 'This confirmation does not exist',
    }, req, res);
  }

  if (confirmationLink.completed_at) {
    handleApiAnalytic(req, 'confirmation_already_completed', `type: ${ type }, token: ${ token }`);
    return returnOrSendResponse(410, {
      status: 'CONFIRMATION_ALREADY_COMPLETED',
      message: 'This confirmation has already been completed',
    }, req, res);
  }

  const currentUTC = Date.now();
  const expirationTime = 604800000; // 7 days
  if (!confirmationLink.created_at || (confirmationLink.created_at + expirationTime) < currentUTC) {
    handleApiAnalytic(req, 'confirmation_expired', `type: ${ type }, token: ${ token }`);
    return returnOrSendResponse(410, {
      status: 'CONFIRMATION_EXPIRED',
      message: 'This confirmation is expired',
    }, req, res);
  }

  handleApiAnalytic(req, 'received_valid_confirmation', `type: ${ type }, token: ${ token }`);
  return confirmationLink;
};
