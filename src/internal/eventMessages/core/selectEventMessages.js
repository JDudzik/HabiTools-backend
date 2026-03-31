import EventMessage from 'knex/models/Event_Message';
import { sanitizeProperties, optional, isUUID, isNumeric, calculatePagination } from 'utils';


export const selectEventMessages = async (payload) => {
  // Permitted payload options:
  //
  // filters:         Filters to apply to the query.
  //   message_id:      Filter by message ID (exact match).
  //   user_id:        Filter by user ID.
  //   resource_id:     Filter by resource ID.
  //   event_slug:      Filter by event slug.
  //   should_notify:   Filter by notification flag.
  //   priority:        Filter by priority level.
  //   min_priority:    Filter by minimum priority level.
  //   max_priority:    Filter by maximum priority level.
  //   acknowledged:    Filter by acknowledgment status.
  // pagination:     Pagination options.
  //   page:            The page number to retrieve (default is 1).
  //   page_size:        The number of items per page (default is 10).

  // sanitize filters:
  const sanitizedFilters = sanitizeProperties(payload.filters, {
    optionalKeys: [
      'message_id',
      'user_id',
      'resource_id',
      'event_slug',
      'should_notify',
      'priority',
      'min_priority',
      'max_priority',
      'acknowledged',
    ],
    trimPayload: true,
    removeDisallowedKeys: true,
    parseInts: true,
    parseBools: true,
    propertyValidations: [
      isUUID('user_id'),
      optional(isUUID('resource_id', 'The resource ID must be a valid UUID')),
      optional(isNumeric('min_priority', 'The minimum priority must be a numeric value')),
      optional(isNumeric('max_priority', 'The maximum priority must be a numeric value')),
    ],
  });
  if (!sanitizedFilters.valid) { return sanitizedFilters.error; }
  const filters = sanitizedFilters.properties;

  const { page, page_size, generatePagination } = calculatePagination(payload?.pagination);

  try {
    const messages = await EventMessage.query()
      .modify((qb) => {
        if (filters?.message_id) {
          qb.where('id', '=', filters.message_id); // Filter by message ID
        }
        if (filters?.user_id) {
          qb.where('user_id', '=', filters.user_id);
        }
        if (filters?.resource_id) {
          qb.where('resource_id', '=', filters.resource_id);
        }
        if (filters?.event_slug) {
          qb.where('event_slug', '=', filters.event_slug);
        }
        if (filters?.should_notify !== undefined) {
          qb.where('should_notify', '=', filters.should_notify);
        }
        if (filters?.priority !== undefined) {
          qb.where('priority', '=', filters.priority);
        }
        if (filters?.min_priority !== undefined) {
          qb.where('priority', '>=', filters.min_priority);
        }
        if (filters?.max_priority !== undefined) {
          qb.where('priority', '<=', filters.max_priority);
        }
        if (filters?.acknowledged !== undefined) {
          qb.where('acknowledged', '=', false);
        }
      })
      .orderBy('created_at', 'desc') // Sort by creation date
      .page(page - 1, page_size);

    messages.pagination = generatePagination(messages?.total);

    return {
      messages: messages.results,
      pagination: messages.pagination,
    };
  } catch (err) {
    throw [ err, 'eventMessages.selectEventMessages' ];
  }
};
