import { returnOrSendResponse } from 'utils';

export const sendInvalidTypeResponse = (type, req, res) => {
  const typeMessage = type ? `of '${ type }' is invalid` : 'is invalid';

  return returnOrSendResponse(404, {
    status: 'CONFIRMATION_TYPE_INVALID',
    message: `Provided email confirmation 'type' ${ typeMessage }`,
  }, req, res);
};
