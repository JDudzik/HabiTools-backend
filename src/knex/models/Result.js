import { Model } from 'objection';

export default class Question extends Model {
  // Table name is the only required property.
  static tableName = 'results';

  // Optional JSON schema. This is not the database schema! Nothing is generated
  // based on this. This is only used for validation. Whenever a model instance
  // is created it is checked against this schema. http://json-schema.org/.
  static jsonSchema = {
    type: 'object',
    required: [ 'created_at', 'start_utc', 'end_utc', 'assessment_id', 'user_id', 'scores' ],
    properties: {
      // id: { type: 'string' }, // Auto-assigned
      created_at: { type: 'integer' },
      deleted_at: { type: [ 'integer', 'null' ]},
      start_utc: { type: 'integer' },
      end_utc: { type: 'integer' },
      assessment_id: { type: 'string' },
      user_id: { type: 'string' },
      coach_id: { type: [ 'string', 'null' ]},
      scores: {
        type: 'array',
        items: {
          type: 'object',
          required: [ 'category', 'score' ],
          properties: {
            category: { type: 'string', minLength: 1, maxLength: 255 },
            score: { type: 'integer' },
          },
        },
      },
    },
  };

  // This object defines the relations to other models.
  static relationMappings = {
    assessment: {
      relation: Model.BelongsToOneRelation,
      // The related model. This can be either a Model subclass constructor or an
      // absolute file path to a module that exports one. We use the file path version
      // here to prevent require loops.
      modelClass: `${ __dirname }/Assessment`,
      join: {
        from: 'results.assessment_id',
        to: 'assessments.id',
      },
    },
    user: {
      relation: Model.BelongsToOneRelation,
      modelClass: `${ __dirname }/User`,
      join: {
        from: 'results.user_id',
        to: 'users.id',
      },
    },
    coach: {
      relation: Model.BelongsToOneRelation,
      modelClass: `${ __dirname }/User`,
      join: {
        from: 'results.coach_id',
        to: 'users.id',
      },
    },
  };
}
