import EventMessage from 'knex/models/Event_Message';
import { sanitizeProperties, isUUID, arrayOf } from 'utils';


export const acknowledgeEventMessages = async (payload) => {
  const sanitizedPayload = sanitizeProperties(payload, {
    requiredKeys: [ 'message_ids', 'user_id' ],
    trimPayload: true,
    removeDisallowedKeys: true,
    propertyValidations: [
      isUUID('user_id'),
      arrayOf('message_ids', isUUID, 'message IDs must be valid UUIDs'),
    ],
  });
  if (!sanitizedPayload.valid) { return sanitizedPayload.error; }
  const { message_ids, user_id } = sanitizedPayload.properties;

  try {
    const updatedRows = await EventMessage.query()
      .where('user_id', user_id)
      .whereIn('id', message_ids)
      .patch({ acknowledged: true });
  
    return updatedRows;
  } catch (err) {
    throw [ err, 'acknowledgeEventMessages' ];
  }
};