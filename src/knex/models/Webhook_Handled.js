import { Model } from 'objection';

export default class WebhookHandled extends Model {
  // Table name is the only required property.
  static tableName = 'webhooks_handled';

  // Optional JSON schema. This is not the database schema! Nothing is generated
  // based on this. This is only used for validation. Whenever a model instance
  // is created it is checked against this schema. http://json-schema.org/.
  static jsonSchema = {
    type: 'object',
    required: [ 'created_at', 'request_id' ],
    properties: {
      // id: { type: 'string' }, // Auto-assigned
      request_id: { type: 'string', minLength: 1, maxLength: 255 },
      request_type: { type: 'string', minLength: 1, maxLength: 255 },
      created_at: { type: 'integer' },
      metadata: { type: [ 'object', 'null' ]},
    },
  };
}
