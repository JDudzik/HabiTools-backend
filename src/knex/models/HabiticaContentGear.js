import { Model } from 'objection';

export default class HabiticaDataGear extends Model {
  static tableName = 'habitica_content_gear';

  static jsonSchema = {
    type: 'object',
    required: [ 'id', 'key', 'last_updated', 'language', 'habitica_content_id' ],
    properties: {
      id: { type: 'string', minLength: 1, maxLength: 255 },
      last_updated: { type: 'integer' },
      language: { type: 'string', minLength: 1, maxLength: 50 },
      key: { type: 'string', minLength: 1, maxLength: 255 },
      set: { type: [ 'string', 'null' ], minLength: 1, maxLength: 255 },
      specialClass: { type: [ 'string', 'null' ], minLength: 1, maxLength: 255 },
      text: { type: [ 'string', 'null' ], minLength: 1, maxLength: 255 },
      notes: { type: [ 'string', 'null' ], minLength: 1, maxLength: 8192 },
      value: { type: [ 'integer', 'null' ]},
      season: { type: [ 'string', 'null' ], minLength: 1, maxLength: 255 },
      str: { type: [ 'integer', 'null' ]},
      type: { type: [ 'string', 'null' ], minLength: 1, maxLength: 255 },
      klass: { type: [ 'string', 'null' ], minLength: 1, maxLength: 255 },
      index: { type: [ 'string', 'null' ], minLength: 1, maxLength: 255 },
      int: { type: [ 'integer', 'null' ]},
      per: { type: [ 'integer', 'null' ]},
      con: { type: [ 'integer', 'null' ]},
      event: { type: [ 'object', 'array', 'null' ]},
      last: { type: [ 'boolean', 'null' ]},
      mystery: { type: [ 'string', 'null' ], minLength: 1, maxLength: 255 },
      habitica_content_id: { type: 'string' },
    },
  };

  $beforeInsert() {
    if (this.id !== this.key) {
      throw new Error('habitica_content_gear requires id and key to be identical');
    }
  }

  $beforeUpdate() {
    if (this.id && this.key && this.id !== this.key) {
      throw new Error('habitica_content_gear requires id and key to be identical');
    }
  }

  static relationMappings = {
    habitica_content: {
      relation: Model.BelongsToOneRelation,
      modelClass: `${ __dirname }/HabiticaContent`,
      join: {
        from: 'habitica_content_gear.habitica_content_id',
        to: 'habitica_content.id',
      },
    },
  };
}
