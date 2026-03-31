import EventMessage from 'knex/models/Event_Message';
import { sanitizeProperties, presence, optional, isUUID } from 'utils';


export const createEventMessage = async (payload) => {
  try {
    const sanitizedPayload = sanitizeProperties(payload, {
      requiredKeys: [ 'user_id', 'message_text', 'priority' ],
      optionalKeys: [ 'resource_id', 'event_slug', 'event_name', 'short_message', 'should_notify', 'acknowledged' ],
      trimPayload: true,
      removeDisallowedKeys: true,
      parseInts: true,
      parseBools: true,
      propertyValidations: [
        presence('user_id', 'The user ID is required'),
        optional(isUUID('resource_id', 'The resource ID must be a valid UUID')),
      ],
    });
    if (!sanitizedPayload.valid) { return sanitizedPayload.error; }
    const messageData = sanitizedPayload.properties;

    // Insert the new event message into the database
    const newMessage = await EventMessage.query().insert({
      user_id: messageData.user_id,
      resource_id: messageData.resource_id || null,
      event_slug: messageData.event_slug,
      event_name: messageData.event_name,
      message_text: messageData.message_text,
      short_message: messageData.short_message || null,
      should_notify: messageData.should_notify || false,
      priority: messageData.priority,
      acknowledged: messageData.acknowledged || false,
      created_at: Date.now(),
    });

    return newMessage;
  } catch (err) {
    throw [ err, 'eventMessages.createEventMessage' ];
  }
};