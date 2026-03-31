import { returnOrSendResponse } from 'utils';
import Email_Confirmation from 'knex/models/Email_Confirmation';
import { resolutionMethods, getValidConfirmation } from '../coreMethods';
import { sendInvalidTypeResponse } from '../helpers';


export const resolveEmailConfirmation = async (type, token, req, res) => {
  const selectedResolutionMethod = resolutionMethods?.[type];
  if (!selectedResolutionMethod) { return sendInvalidTypeResponse(type, req, res); }

  const confirmation = await getValidConfirmation(type, token, req, res);
  if (!confirmation) { return; }

  const resolutionData = await selectedResolutionMethod.resolve(confirmation, req, res);
  if (!resolutionData) { return; }
  if (resolutionData?.code) { returnOrSendResponse(resolutionData.code, resolutionData.responseContent, req, res); }

  if (resolutionData) {
    return await Email_Confirmation.query()
      .where('type', type)
      .andWhere('token', token)
      .first()
      .patch({ completed_at: Date.now() })
      .then(() => {
        res.send('success');
      })
      .catch((err) => { throw [ err, 'confirmationData.resolveEmailConfirmation' ]; });
  }
};
