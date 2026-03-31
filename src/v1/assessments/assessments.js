import { transaction } from 'objection';
import Assessment from 'knex/models/Assessment';
import { allowValidUUID } from 'utils';
import { permissionsCheck, allowByPermissions } from 'internal/userController';
import { assessments } from 'internal/assessments';
import deepTrim from 'deep-trim';


const assessmentsApi = {

  // Create Assessment
  //
  // -- POST --
  // {API_URL}/v1/auth/assessments/create
  // -- PARAMS --
  // description:  String for the assessment description
  // is_hidden:    Boolean determining if this assessment is hidden from the assessment list
  // -- REQUIRED --
  // ID:                      The ID of the assessment
  // title:                   String for the title
  // assessment_type:         String determining the type of assessment
  // questions_per_category:  Integer stating how many questions per category
  // categories:
  //   name: String of the nane of the category
  // questions:
  //   category: String that should link to an available category
  //   text: The string of the question
  // -- ERROR CODES --
  // INCORRECT_INSERT_DATA
  create: async (req, res) => {
    const allowed = await allowByPermissions(req, res, 'assessment_creation');
    if (!allowed) { return; }

    const createdAssessment = await assessments.createAssessment(deepTrim(req.body), req, res);
    if (!createdAssessment) { return; }

    res.send(createdAssessment);
  },


  // List
  //
  // -- GET --
  // {API_URL}/v1/auth/assessments/list
  // -- PARAMS --
  // show_hidden: Boolean (will require specific user permissions)
  list: async (req, res) => {
    const canViewHidden = await permissionsCheck.has(req, 'view_hidden_assessments');
    const canViewResults = await permissionsCheck.has(req, 'access_assessment_results');

    const showHidden = !!req.query.show_hidden && canViewHidden
      ? true
      : undefined;
    const inverseShowHidden = showHidden ? undefined : true;
    const selectedValues = showHidden
      ? [ 'id', 'created_at', 'title', 'description', 'is_hidden' ]
      : [ 'id', 'title', 'description' ];

    const eagerResults = canViewResults ? 'results' : '';

    await Assessment.query()
      .skipUndefined()
      .select(selectedValues)
      .whereNot('is_hidden', '=', inverseShowHidden)
      .withGraphFetched(eagerResults)
      .modifyGraph('results', (builder) => {
        builder.groupBy('results.assessment_id');
        builder.count({ count: '*' });
        builder.whereNull('deleted_at');
      })

      .then(assessmentList => res.send(assessmentList) )
      .catch((err) => { throw [ err, 'assessments.list' ]; });
  },


  // Get Assessment
  //
  // -- GET --
  // {API_URL}/v1/auth/assessments/get_assessment/:id
  // -- PARAMS --
  // ID: the ID of the assessment
  // -- ERROR CODES --
  // INVALID_ID
  getAssessment: async (req, res) => {
    const id = req.params.id;

    if (!allowValidUUID(id, req, res)) { return; }

    await Assessment.query()
      .where('id', '=', id)
      .withGraphFetched('[categories, questions]')
      .modifyGraph('[categories, questions]', (builder) => {
        builder.whereNull('deleted_at');
      })

      .then(assessment => res.send(assessment))
      .catch((err) => { throw [ err, 'assessments.getAssessment' ]; });
  },


  // Upsert
  //
  // -- PUT --
  // {API_URL}/v1/auth/assessments/upsert/:id
  // -- PARAMS --
  // ID: The ID of the assessment
  // request body: JSON object. Graph data to update
  // -- ERROR CODES --
  // INVALID_ID
  upsert: async (req, res) => {
    const allowed = await allowByPermissions(req, res, 'assessment_control');
    if (!allowed) { return; }

    if (!allowValidUUID(req.params.id, req, res)) { return; }

    const graph = deepTrim(req.body);

    // Make sure only one person was received.
    if (Array.isArray(graph)) {
      throw [ new Error('Received more than one user in graph'), 'assessments.upsert.isArray' ];
    }

    // Make sure the person has the correct id because `upsertGraph` uses the id fields
    // to determine which models need to be updated and which inserted.
    graph.id = req.params.id;


    await transaction(Assessment.knex(), (trx) => {
      return (
        Assessment.query(trx)
          // For security reasons, limit the relations that can be upserted.
          .allowGraph('[categories, questions]')
          .upsertGraph(graph)
      );
    })
      .then(upsertedData => res.send(upsertedData))
      .catch((err) => { throw [ err, 'assessments.getAssessment' ]; });
  },


  // Delete
  //
  // -- DELETE --
  // {API_URL}/v1/auth/assessments/delete/:id
  // -- PARAMS --
  // ID: The ID of the assessment - REQUIRED
  // -- ERROR CODES --
  // NO_ASSESSMENT_ID, INVALID_ID
  delete: async (req, res) => {
    const allowed = await allowByPermissions(req, res, 'assessment_control');
    if (!allowed) { return; }

    const deletedAssessment = await assessments.deleteAssessment(req.params.id, req, res);
    if (!deletedAssessment) { return; }
    res.send(deletedAssessment);
  },
};

module.exports = assessmentsApi;
