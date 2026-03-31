import { Model } from 'objection';

export default class Question extends Model {
  // Table name is the only required property.
  static tableName = 'assessment_categories';

  // Optional JSON schema. This is not the database schema! Nothing is generated
  // based on this. This is only used for validation. Whenever a model instance
  // is created it is checked against this schema. http://json-schema.org/.
  static jsonSchema = {
    type: 'object',
    required: [ 'created_at', 'assessment_id', 'name' ],
    properties: {
      // id: { type: 'string' }, // Auto-assigned
      created_at: { type: 'integer' },
      deleted_at: { type: [ 'integer', 'null' ]},
      name: { type: 'string', minLength: 1, maxLength: 255 },
      assessment_id: { type: 'string' },
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
        from: 'assessment_categories.assessment_id',
        to: 'assessments.id',
      },
    },
  };
}
