import { Model } from 'objection';

export default class Article extends Model {
  // Table name is the only required property.
  static tableName = 'articles';

  // Optional JSON schema. This is not the database schema! Nothing is generated
  // based on this. This is only used for validation. Whenever a model instance
  // is created it is checked against this schema. http://json-schema.org/.
  static jsonSchema = {
    type: 'object',
    required: [ 'created_at', 'title', 'type', 'slug', 'version', 'deletable' ],
    properties: {
      // id: { type: 'string' }, // Auto-assigned
      created_at: { type: 'integer' },
      deleted_at: { type: [ 'integer', 'null' ]},
      updated_at: { type: [ 'integer', 'null' ]},
      title:      { type: 'string', minLength: 1, maxLength: 255 },
      type:       { type: 'string', minLength: 1, maxLength: 255 },
      slug:       { type: 'string', minLength: 1, maxLength: 255 },
      version:    { type: 'integer' },
      require_simple: { type: [ 'boolean', 'null' ]},
      disable_newlines: { type: [ 'boolean', 'null' ]},
      deletable: { type: 'boolean' },
      author_id: { type: [ 'string', 'null' ]},
    },
  };

  static relationMappings = {
    tags: {
      relation: Model.HasManyRelation,
      // The related model. This can be either a Model subclass constructor or an
      // absolute file path to a module that exports one. We use the file path version
      // here to prevent require loops.
      modelClass: `${ __dirname }/Article_Tag`,
      join: {
        from: 'articles.id',
        to: 'article_tags.article_id',
      },
    },

    content: {
      relation: Model.HasOneRelation,
      modelClass: `${ __dirname }/Article_Content`,
      join: {
        from: 'articles.id',
        to: 'article_contents.id',
      },
    },

    author: {
      relation: Model.BelongsToOneRelation,
      modelClass: `${ __dirname }/User`,
      join: {
        from: 'articles.author_id',
        to: 'users.id',
      },
    },
  };
}
