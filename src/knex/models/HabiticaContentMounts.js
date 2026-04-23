import { Model } from 'objection';

export default class HabiticaDataMounts extends Model {
  static tableName = 'habitica_content_mounts';

  static jsonSchema = {
    type: 'object',
    required: [ 'id', 'key', 'last_updated', 'language', 'habitica_content_id' ],
    properties: {
      id: { type: 'string', minLength: 1, maxLength: 255 },
      last_updated: { type: 'integer' },
      language: { type: 'string', minLength: 1, maxLength: 50 },
      key: { type: 'string', minLength: 1, maxLength: 255 },
      type: { type: [ 'string', 'null' ], minLength: 1, maxLength: 255 },
      potion: { type: [ 'string', 'null' ], minLength: 1, maxLength: 255 },
      egg: { type: [ 'string', 'null' ], minLength: 1, maxLength: 255 },
      text: { type: [ 'string', 'null' ], minLength: 1, maxLength: 255 },
      habitica_content_id: { type: 'string' },
    },
  };

  $beforeInsert() {
    if (this.id !== this.key) {
      throw new Error('habitica_content_mounts requires id and key to be identical');
    }
  }

  $beforeUpdate() {
    if (this.id && this.key && this.id !== this.key) {
      throw new Error('habitica_content_mounts requires id and key to be identical');
    }
  }

  static relationMappings = {
    habitica_content: {
      relation: Model.BelongsToOneRelation,
      modelClass: `${ __dirname }/HabiticaContent`,
      join: {
        from: 'habitica_content_mounts.habitica_content_id',
        to: 'habitica_content.id',
      },
    },
  };
}
