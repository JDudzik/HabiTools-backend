import Email_Confirmation from 'knex/models/Email_Confirmation';
import { sendTemplate } from 'utils';
import { resolutionMethods } from '../coreMethods';
import { generateToken, sendInvalidTypeResponse } from '../helpers';
import deepTrim from 'deep-trim';


export const composeEmailConfirmation = async (config) => {
  const {
    type,
    metadata,
    templateData,
    user_id,
    requested_by_user_id,
  } = config;
  const selectedCompletionMethod = resolutionMethods?.[type];
  if (!selectedCompletionMethod) { return sendInvalidTypeResponse(type); }

  const token = await generateToken();
  const utcNow = Date.now();

  const newConfirmation = await Email_Confirmation.query()
    .insert({
      created_at: utcNow,
      type,
      token,
      metadata: deepTrim(metadata),
      user_id,
      requested_by_user_id,
    });

  if (templateData) {
    sendTemplate({
      ...templateData,
      templateId: selectedCompletionMethod.templateId,
      params: {
        ...templateData.params,
        'CONFIRMATION_LINK': `${ selectedCompletionMethod.confirmationLink }&token=${ token }`,
      },
    });
  }

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('\n---------------------\ntype:', type, '\ntoken:', token, '\n---------------------\n');
  }

  return newConfirmation;
};
