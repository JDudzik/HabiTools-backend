import { Model } from 'objection';

export default class Assessment extends Model {
  // Table name is the only required property.
  static tableName = 'assessments';

  // Optional JSON schema. This is not the database schema! Nothing is generated
  // based on this. This is only used for validation. Whenever a model instance
  // is created it is checked against this schema. http://json-schema.org/.
  static jsonSchema = {
    type: 'object',
    required: [ 'created_at', 'title', 'assessment_type', 'questions_per_category' ],
    properties: {
      // id: { type: 'string' }, // Auto-assigned
      created_at: { type: 'integer' },
      deleted_at: { type: [ 'integer', 'null' ]},
      title: { type: 'string', minLength: 1, maxLength: 255 },
      description: { type: 'string', minLength: 1, maxLength: 255 },
      assessment_type: { type: 'string', minLength: 1, maxLength: 255 },
      questions_per_category: { type: 'integer' },
      is_hidden: { type: 'boolean' },
    },
  };

  // This object defines the relations to other models.
  static relationMappings = {
    categories: {
      relation: Model.HasManyRelation,
      // The related model. This can be either a Model subclass constructor or an
      // absolute file path to a module that exports one. We use the file path version
      // here to prevent require loops.
      modelClass: `${ __dirname }/Assessment_Category`,
      join: {
        from: 'assessments.id',
        to: 'assessment_categories.assessment_id',
      },
    },
    questions: {
      relation: Model.HasManyRelation,
      // The related model. This can be either a Model subclass constructor or an
      // absolute file path to a module that exports one. We use the file path version
      // here to prevent require loops.
      modelClass: `${ __dirname }/Question`,
      join: {
        from: 'assessments.id',
        to: 'questions.assessment_id',
      },
    },
    results: {
      relation: Model.HasManyRelation,
      // The related model. This can be either a Model subclass constructor or an
      // absolute file path to a module that exports one. We use the file path version
      // here to prevent require loops.
      modelClass: `${ __dirname }/Result`,
      join: {
        from: 'assessments.id',
        to: 'results.assessment_id',
      },
    },
  };
}
