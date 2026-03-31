import { Model } from 'objection';

export default class Article_Content extends Model {
  // Table name is the only required property.
  static tableName = 'article_contents';

  // Optional JSON schema. This is not the database schema! Nothing is generated
  // based on this. This is only used for validation. Whenever a model instance
  // is created it is checked against this schema. http://json-schema.org/.
  static jsonSchema = {
    type: 'object',
    required: [ 'content' ],
    properties: {
      // id: { type: 'string' }, // Auto-assigned
      content: { type: 'string' },
    },
  };

  static relationMappings = {
    article: {
      relation: Model.BelongsToOneRelation,
      modelClass: `${ __dirname }/Article`,
      join: {
        from: 'article_contents.id',
        to: 'articles.id',
      },
    },
  };
}
