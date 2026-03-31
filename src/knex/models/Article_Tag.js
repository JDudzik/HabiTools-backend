import { Model } from 'objection';

export default class Article_Tag extends Model {
  // Table name is the only required property.
  static tableName = 'article_tags';

  // Optional JSON schema. This is not the database schema! Nothing is generated
  // based on this. This is only used for validation. Whenever a model instance
  // is created it is checked against this schema. http://json-schema.org/.
  static jsonSchema = {
    type: 'object',
    required: [ 'created_at', 'tag', 'article_id' ],
    properties: {
      // id: { type: 'string' }, // Auto-assigned
      created_at: { type: 'integer' },
      tag: { type: 'string' },
      article_id: { type: 'string' },
    },
  };

  static relationMappings = {
    article: {
      relation: Model.BelongsToOneRelation,
      modelClass: `${ __dirname }/Article`,
      join: {
        from: 'article_tags.article_id',
        to: 'articles.id',
      },
    },
  };
}
