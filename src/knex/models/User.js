import { Model } from 'objection';

export default class User extends Model {
  // Table name is the only required property.
  static tableName = 'users';

  // Optional JSON schema. This is not the database schema! Nothing is generated
  // based on this. This is only used for validation. Whenever a model instance
  // is created it is checked against this schema. http://json-schema.org/.
  static jsonSchema = {
    type: 'object',
    required: [ 'created_at', 'first_name', 'last_name', 'email' ],
    properties: {
      id:         { type: 'string' },
      created_at: { type: 'integer' },
      disabled_at: { type: [ 'integer', 'null' ]},
      first_name: { type: 'string', minLength: 1, maxLength: 255 },
      last_name:  { type: 'string', minLength: 1, maxLength: 255 },
      email:      { type: 'string', minLength: 1, maxLength: 255 },
      stripe_customer_id: { type: [ 'string', 'null' ]},
      has_verified_email: { type: 'boolean' },
    },
  };

  static relationMappings = {
    // Note: Whenever you add/remove a relation definition, also add/remove code from these locations:
    // - deleteUser: internal/userController/userHelpers/deleteUser

    password: {
      relation: Model.HasManyRelation,
      // The related model. This can be either a Model subclass constructor or an
      // absolute file path to a module that exports one. We use the file path version
      // here to prevent require loops.
      modelClass: `${ __dirname }/User_Password`,
      join: {
        from: 'users.id',
        to: 'user_passwords.id',
      },
    },

    user_subscriptions: {
      relation: Model.HasManyRelation,
      modelClass: `${ __dirname }/User_Subscription`,
      join: {
        from: 'users.id',
        to: 'user_subscriptions.id',
      },
    },

    permissions: {
      relation: Model.ManyToManyRelation,
      modelClass: `${ __dirname }/Permission`,
      join: {
        from: 'users.id',
        through: {
          from: 'users_to_permissions.user_id',
          to: 'users_to_permissions.permission_id',
        },
        to: 'permissions.id',
      },
    },

    groups: {
      relation: Model.ManyToManyRelation,
      modelClass: `${ __dirname }/Group`,
      join: {
        from: 'users.id',
        through: {
          from: 'users_to_groups.user_id',
          to: 'users_to_groups.group_id',
        },
        to: 'groups.id',
      },
    },

    associated_confirmations: {
      relation: Model.HasManyRelation,
      // The related model. This can be either a Model subclass constructor or an
      // absolute file path to a module that exports one. We use the file path version
      // here to prevent require loops.
      modelClass: `${ __dirname }/Email_Confirmation`,
      join: {
        from: 'users.id',
        to: 'email_confirmations.user_id',
      },
    },

    requested_confirmations: {
      relation: Model.HasManyRelation,
      // The related model. This can be either a Model subclass constructor or an
      // absolute file path to a module that exports one. We use the file path version
      // here to prevent require loops.
      modelClass: `${ __dirname }/Email_Confirmation`,
      join: {
        from: 'users.id',
        to: 'email_confirmations.requested_by_user_id',
      },
    },

    articles: {
      relation: Model.HasManyRelation,
      modelClass: `${ __dirname }/Article`,
      join: {
        from: 'users.id',
        to: 'articles.author_id',
      },
    },

    crons: {
      relation: Model.HasManyRelation,
      modelClass: `${ __dirname }/Cron`,
      join: {
        from: 'users.id',
        to: 'crons.user_id',
      },
    },

    webhooks: {
      relation: Model.HasManyRelation,
      modelClass: `${ __dirname }/Webhook`,
      join: {
        from: 'users.id',
        to: 'webhooks.user_id',
      },
    },

    analytics: {
      relation: Model.HasManyRelation,
      modelClass: `${ __dirname }/Analytic`,
      join: {
        from: 'users.id',
        to: 'analytics.user_id',
      },
    },

    errors: {
      relation: Model.HasManyRelation,
      modelClass: `${ __dirname }/Error`,
      join: {
        from: 'users.id',
        to: 'errors.user_id',
      },
    },

    feedbacks: {
      relation: Model.HasManyRelation,
      modelClass: `${ __dirname }/Feedback`,
      join: {
        from: 'users.id',
        to: 'feedbacks.user_id',
      },
    },

    event_messages: {
      relation: Model.HasManyRelation,
      modelClass: `${ __dirname }/Event_Message`,
      join: {
        from: 'users.id',
        to: 'event_messages.user_id',
      },
    },
  };
}
