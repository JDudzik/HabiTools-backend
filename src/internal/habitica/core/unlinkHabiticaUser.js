import HabiticaUser from 'knex/models/HabiticaUser';
import HabiticaTool from 'knex/models/HabiticaTool';
import { teardownToolResources } from '../methods/teardownToolResources';
import { createEventMessage } from 'internal/eventMessages/core/createEventMessage';
import { sanitizeProperties, isUUID, returnOrSendResponse, handleApiAnalytic } from 'utils';


/**
 * Unlinks a Habitica account from a Habitools user by deleting the link and all associated data from the database, and optionally sending a notification to the user about the unlinking.
 * @param {Object} properties - The properties for unlinking the Habitica account.
 * @param {string} properties.user_id - The user ID of the Habitools user unlinking their account.
 * @param {boolean} [properties.shouldNotify=false] - Whether to send a notification to the user about the unlinking.
 * @param {Object} [properties.req] - The Express request object, used for analytics. Optional if not unlinking through an API route.
 * @returns {Promise<Object>} - A success message, or an error response if no linked account is found.
 */
export const unlinkHabiticaUser = async (properties) => {
  const sanitizedPayload = sanitizeProperties(properties, {
    requiredKeys: [ 'user_id' ],
    optionalKeys: [ 'shouldNotify' ],
    trimPayload: true,
    removeDisallowedKeys: true,
    parseBools: true,
    propertyValidations: [
      isUUID('user_id', 'user_id must be a valid UUID'),
    ],
  });
  if (!sanitizedPayload.valid) { return sanitizedPayload.error; }
  const sanitizedProperties = sanitizedPayload.properties;

  const habiticaUser = await HabiticaUser.query().where({ user_id: sanitizedProperties.user_id }).first();
  if (!habiticaUser) {
    return returnOrSendResponse(404, {
      status: 'NOT_LINKED',
      message: 'No linked Habitica account found.',
    });
  }

  const tools = await HabiticaTool.query()
    .where({ habitica_user_id: habiticaUser.id })
    .whereNull('deleted_at')
    .orderBy('created_at', 'desc');

  for (const tool of tools) {
    await teardownToolResources({ resourceId: tool.id }).catch(() => {});
  }

  // Hard-delete habitica_users row (cascades to habitica_user_data)
  await HabiticaUser.query().deleteById(habiticaUser.id);

  handleApiAnalytic(properties?.req, 'unlinked_habitica_user', JSON.stringify({
    habitica_username: habiticaUser?.username || null,
    habitica_email: habiticaUser?.email || null,
  }));

  if (sanitizedProperties.shouldNotify) {
    await createEventMessage({
      user_id: sanitizedProperties.user_id,
      event_slug: 'habitica-user-unlinked',
      event_name: 'Habitica User Unlinked',
      message_text: 'Your Habitica account has been unlinked and all associated tools have been disabled.',
      short_message: 'Habitica account unlinked.',
      should_notify: true,
      priority: 2,
    }).catch(() => {});
  }

  return { success: true };
};
