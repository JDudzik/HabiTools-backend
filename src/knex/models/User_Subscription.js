import { Model } from 'objection';

export default class User_Subscription extends Model {
  static tableName = 'user_subscriptions';

  // Optional JSON schema. This is not the database schema! Nothing is generated
  // based on this. This is only used for validation. Whenever a model instance
  // is created it is checked against this schema. http://json-schema.org/.
  static jsonSchema = {
    type: 'object',
    // required: [ '' ],
    properties: {
      // id: { type: 'string' },
      stripe_customer_id: { type: [ 'string', 'null' ]},
      updated_at: { type: [ 'integer', 'null' ]},
      is_sub_active: { type: [ 'boolean', 'null' ]},
      sub_purchased: { type: [ 'integer', 'null' ]},
      sub_created: { type: [ 'integer', 'null' ]},
      sub_expires: { type: [ 'integer', 'null' ]},
      entitlements: { type: [ 'string', 'null' ]},
    },
  };

  static relationMappings = {
    user: {
      relation: Model.BelongsToOneRelation,
      modelClass: `${ __dirname }/User`,
      join: {
        from: 'user_subscriptions.id',
        to: 'users.id',
      },
    },
  };
}
