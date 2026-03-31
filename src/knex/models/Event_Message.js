import { Model } from 'objection';

export default class EventMessage extends Model {
  // Table name is the only required property.
  static tableName = 'event_messages';

  // Optional JSON schema. This is not the database schema! Nothing is generated
  // based on this. This is only used for validation. Whenever a model instance
  // is created it is checked against this schema. http://json-schema.org/.
  static jsonSchema = {
    type: 'object',
    required: [ 'created_at', 'user_id', 'message_text', 'priority' ],
    properties: {
      // id: { type: 'string' }, // Auto-assigned
      created_at: { type: 'integer' },
      user_id: { type: [ 'string' ]},
      resource_id: { type: [ 'string', 'null' ]},
      event_slug: { type: 'string', minLength: 1, maxLength: 255 },
      event_name: { type: 'string', minLength: 1, maxLength: 255 },
      message_text: { type: 'string', minLength: 1 },
      short_message: { type: [ 'string', 'null' ], maxLength: 255 },
      should_notify: { type: [ 'boolean', 'null' ]},
      priority: { type: 'integer', enum: [ 0, 1, 2, 3 ]}, // 0="debug", 1="normal", 2="high", 3="severe"
      acknowledged: { type: [ 'boolean', 'null' ]},
    },
  };

  // This object defines the relations to other models.
  static relationMappings = {
    user: {
      relation: Model.BelongsToOneRelation,
      modelClass: `${ __dirname }/User`,
      join: {
        from: 'event_messages.user_id',
        to: 'users.id',
      },
    },
  };
}