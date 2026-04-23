import { Model } from 'objection';

export default class HabiticaUserData extends Model {
  static tableName = 'habitica_user_data';

  static jsonSchema = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      last_updated: { type: [ 'integer', 'null' ]},
      username: { type: [ 'string', 'null' ], minLength: 1, maxLength: 255 },
      email: { type: [ 'string', 'null' ], minLength: 1, maxLength: 255 },
      achievements: { type: [ 'object', 'array', 'null' ]},
      items: { type: [ 'object', 'array', 'null' ]},
      party: { type: [ 'object', 'array', 'null' ]},
      webhooks: { type: [ 'object', 'array', 'null' ]},
      hp: { type: [ 'number', 'null' ]},
      mp: { type: [ 'number', 'null' ]},
      exp: { type: [ 'number', 'null' ]},
      gp: { type: [ 'number', 'null' ]},
      lvl: { type: [ 'integer', 'null' ]},
      class: { type: [ 'string', 'null' ], minLength: 1, maxLength: 255 },
      maxHealth: { type: [ 'integer', 'null' ]},
      maxMP: { type: [ 'integer', 'null' ]},
      lastCron: { type: [ 'integer', 'null' ]},
    },
  };

  static relationMappings = {
    habitica_user: {
      relation: Model.BelongsToOneRelation,
      modelClass: `${ __dirname }/HabiticaUser`,
      join: {
        from: 'habitica_user_data.id',
        to: 'habitica_users.id',
      },
    },
  };
}
