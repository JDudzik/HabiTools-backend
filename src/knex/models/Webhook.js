import { Model } from 'objection';

export default class Webhook extends Model {
  // Table name is the only required property.
  static tableName = 'webhooks';

  // Optional JSON schema. This is not the database schema! Nothing is generated
  // based on this. This is only used for validation. Whenever a model instance
  // is created it is checked against this schema. http://json-schema.org/.
  static jsonSchema = {
    type: 'object',
    required: [ 'created_at', 'url_id', 'task_name' ],
    properties: {
      // id: { type: 'string' }, // Auto-assigned
      user_id: { type: [ 'string', 'null' ]},
      url_id: { type: 'string', minLength: 1, maxLength: 255 },
      resource_id: { type: [ 'string', 'null' ]},
      task_name: { type: 'string', minLength: 1, maxLength: 255 },
      created_at: { type: 'integer' },
      updated_at: { type: [ 'integer', 'null' ]},
      deleted_at: { type: [ 'integer', 'null' ]},
      deletes_attempted: { type: [ 'integer', 'null' ]},
      is_active: { type: [ 'boolean', 'null' ]},
      options: { type: [ 'object', 'null' ]},
      expires_at: { type: [ 'integer', 'null' ]},
      data: { type: [ 'object', 'null' ]},
    },
  };


  // This object defines the relations to other models.
  static relationMappings = {
    user: {
      relation: Model.BelongsToOneRelation,
      // The related model. This can be either a Model subclass constructor or an
      // absolute file path to a module that exports one. We use the file path version
      // here to prevent require loops.
      modelClass: `${ __dirname }/User`,
      join: {
        from: 'webhooks.user_id',
        to: 'users.id',
      },
    },
  };
}
