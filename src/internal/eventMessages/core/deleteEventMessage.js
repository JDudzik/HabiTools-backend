import EventMessage from 'knex/models/Event_Message';
import { sanitizeProperties, isUUID } from 'utils';


export const deleteEventMessage = async (payload) => {
  const sanitizedPayload = sanitizeProperties(payload, {
    optionalKeys: [ 'message_id', 'user_id' ],
    trimPayload: true,
    removeDisallowedKeys: true,
    propertyValidations: [
      isUUID('message_id'),
      isUUID('user_id'),
    ],
  });
  if (!sanitizedPayload.valid) { return sanitizedPayload.error; }
  const { message_id, user_id } = sanitizedPayload.properties;

  try {
    const deletedRows = await EventMessage.query()
      .where('user_id', '=', user_id)
      .where('id', '=', message_id)
      .delete();

    return deletedRows;
  } catch (err) {
    throw [ err, 'deleteEventMessage' ];
  }
};
