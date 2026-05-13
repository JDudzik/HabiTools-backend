import { Model } from 'objection';

export default class HabiticaTool extends Model {
  static tableName = 'habitica_tools';

  static jsonSchema = {
    type: 'object',
    required: [ 'created_at', 'habitica_user_id', 'tool_slug' ],
    properties: {
      id: { type: 'string' },
      created_at: { type: 'integer' },
      updated_at: { type: [ 'integer', 'null' ]},
      deleted_at: { type: [ 'integer', 'null' ]},
      habitica_user_id: { type: 'string' },
      tool_slug: { type: 'string', minLength: 1, maxLength: 255 },
      expires_at: { type: [ 'integer', 'null' ]},
      last_refreshed_at: { type: [ 'integer', 'null' ]},
      data: { type: [ 'object', 'null' ]},
    },
  };

  static relationMappings = {
    habitica_user: {
      relation: Model.BelongsToOneRelation,
      modelClass: `${ __dirname }/HabiticaUser`,
      join: {
        from: 'habitica_tools.habitica_user_id',
        to: 'habitica_users.id',
      },
    },

    crons: {
      relation: Model.HasManyRelation,
      modelClass: `${ __dirname }/Cron`,
      join: {
        from: 'habitica_tools.id',
        to: 'crons.resource_id',
      },
    },

    webhooks: {
      relation: Model.HasManyRelation,
      modelClass: `${ __dirname }/Webhook`,
      join: {
        from: 'habitica_tools.id',
        to: 'webhooks.resource_id',
      },
    },

    event_messages: {
      relation: Model.HasManyRelation,
      modelClass: `${ __dirname }/Event_Message`,
      join: {
        from: 'habitica_tools.id',
        to: 'event_messages.resource_id',
      },
    },
  };
}
