import { transaction } from 'objection';
import Assessment from 'knex/models/Assessment';
import {
  restrictProperties,
  handleApiAnalytic,
  allowValidUUID,
} from 'utils';
import deepTrim from 'deep-trim';


export const createAssessment = async (properties, req, res) => {
  const filteredProperties = restrictProperties(
    deepTrim(properties),
    [ 'id', 'created_at', 'deleted_at' ],
  );

  if (Object.keys(filteredProperties).length < 1) {
    if (res) {
      res.status(400);
      res.json({
        status: 'INCORRECT_INSERT_DATA',
        message: 'Request does not contain correct data to insert',
      });
    }
    return false;
  }

  const creationUtc = Date.now();
  const graph = {
    ...filteredProperties,
    created_at: creationUtc,
    categories: properties.categories && properties.categories.map(category => ({
      created_at: creationUtc,
      name: category,
    })),
    questions: properties.questions && properties.questions.map(question => ({
      created_at: creationUtc,
      category: question.category,
      text: question.text,
    })),

  };


  return await transaction(Assessment.knex(), (trx) => {
    return (
      Assessment.query(trx)
      // For security reasons, limit the relations that can be upserted.
        .allowGraph('[categories, questions]')
        .insertGraph(graph)
    );
  })
    .then(upsertedData => upsertedData)
    .catch((err) => { throw [ err, 'assessments.createAssessment' ]; });
};


export const deleteAssessment = async (assessmentId, req, res) => {
  if (!allowValidUUID(assessmentId, req, res)) { return; }

  return await Assessment.query()
    .patchAndFetchById(assessmentId, { deleted_at: Date.now() })

    .then((result) => {
      if (!result) {
        // If "result" is undefined, it means the provided ID doesn't exist in the table
        if (res) {
          res.status(400);
          res.json({
            status: 'NO_ASSESSMENT_ID',
            message: 'No Assessment with the provided ID exists',
          });
        }
        return;
      }
      handleApiAnalytic(req, 'assessment_deleted', JSON.stringify(assessmentId));
      return result;
    })
    .catch((err) => { throw [ err, 'assessments.deleteAssessment' ]; });
};
