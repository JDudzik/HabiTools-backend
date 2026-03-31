import { sendInvalidTypeResponse } from '../helpers';
import { resolutionMethods, getValidConfirmation } from '../coreMethods';

export const isConfirmationValid = async (type, token, req, res) => {
  // Note: This extra method exists so that the frontend can check if a token is valid then display the correct
  // content (user inputs, errors, "already completed", etc).

  const selectedResolutionMethod = resolutionMethods?.[type];
  if (!selectedResolutionMethod) { return sendInvalidTypeResponse(type, req, res); }

  const confirmation = await getValidConfirmation(type, token, req, res);
  if (!confirmation) { return; }

  res.send('valid');
  return confirmation;
};
