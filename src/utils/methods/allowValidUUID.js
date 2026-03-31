import { uuidIsValid } from './uuidIsValid';
import { returnOrSendResponse } from './returnOrSendResponse';
import { handleApiAnalytic } from './handleApiAnalytic';


export const allowValidUUID = (uuid, req, res) => {
  if (!uuidIsValid(uuid)) {
    handleApiAnalytic(req, 'invalid_id_provided', `provided ID: ${ uuid }`);
    returnOrSendResponse(404, {
      status: 'INVALID_ID',
      message: 'Invalid ID was provided',
    }, req, res);
    return;
  }
  return true;
};