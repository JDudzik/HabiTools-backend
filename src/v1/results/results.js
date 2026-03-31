import Result from 'knex/models/Result';
import Assessment_Category from 'knex/models/Assessment_Category';
import {
  restrictProperties,
  getLoggedInUser,
  allowValidUUID,
} from 'utils';
import { allowByPermissions } from 'internal/userController';
import deepTrim from 'deep-trim';


const calculateTopScores = (scores, max, min, variance) => {
  const highestScore = scores[0].score;
  const topScores = scores.filter((category, index) => {
    if (index + 1 <= min) { return true; }
    if (index + 1 > max ) { return false; }
    if (category.score < highestScore - variance) { return false; }
    return true;
  });
  return topScores.map(topScore => topScore.category);
};

const countResults = async (id, deletedColumn = 'deleted_at', betweenValues = {}) => {
  return await Result.query()
    .where('assessment_id', '=', id)
    .skipUndefined()
    .count({ count: '*' })
    .whereNull(deletedColumn)
    .whereBetween(betweenValues.whereBetweenValue, betweenValues.rangeArray)

    .then(count => count[0].count)
    .catch((err) => { throw [ err, 'results.countResults' ]; });
};


const results = {

  // Create
  //
  // -- POST --
  // {API_URL}/v1/auth/results/create
  // -- PARAMS --
  // Most fields from Result table
  // -- REQUIRED --
  // start_utc, end_utc, assessment_id, scores,
  // -- ERROR CODES --
  // INCORRECT_DATA, UNEQUAL_CATEGORIES
  create: async (req, res) => {
    const properties = restrictProperties(
      deepTrim(req.body),
      [ 'id', 'created_at', 'deleted_at', 'user_id', 'coach_id', 'scores' ],
    );

    if (Object.keys(properties).length < 1 || !req.body.scores) {
      res.status(400);
      res.json({
        status: 'INCORRECT_DATA',
        message: 'Request does not contain correct data to insert',
      });
      return;
    }

    const assessment_categories = await Assessment_Category.query()
      .skipUndefined()
      .where('assessment_id', '=', properties.assessment_id)
      .whereNull('deleted_at')
      .select([ 'name' ]);

    // Filtering out categories from the scores that don't exist within the database
    const filteredScores = req.body.scores.filter((score) => {
      const indexOfCategory = assessment_categories.findIndex(category => category.name === score.category);
      return indexOfCategory !== -1;
    });

    // Make sure both the filtered scores and database's categories have the same number of items
    if (filteredScores.length !== assessment_categories.length) {
      res.status(400);
      res.json({
        status: 'UNEQUAL_CATEGORIES',
        message: 'Request contains incorrect categories',
      });
      return;
    }

    const userData = await getLoggedInUser(req, [ 'id', 'coach_id' ]) || {};

    const finalProperties = {
      ...properties,
      user_id: userData.id,
      coach_id: userData.coach_id,
      scores: filteredScores,
      created_at: properties.end_utc,
    };

    await Result.query()
      .insert(finalProperties)

      .then(result => res.send(result))
      .catch((err) => {
        throw [ err, 'results.create' ];
      });
  },


  // Count Results By Assessment
  //
  // -- GET --
  // {API_URL}/v1/auth/results/count_results_by_assessment/:id
  // -- PARAMS --
  // ID: the ID of the assessment
  // -- ERROR CODES --
  // INADEQUATE_PERMISSION, INVALID_ID
  countResultsByAssessment: async (req, res) => {
    const allowed = await allowByPermissions(req, res, 'access_assessment_results');
    if (!allowed) { return; }

    if (!allowValidUUID(req.params.id, req, res)) { return; }

    const totalResults = await countResults(req.params.id);
    res.send(totalResults.toString());
  },


  // Search Results By Assessment
  //
  // -- GET --
  // {API_URL}/v1/auth/results/search_results_by_assessment/:id
  // -- PARAMS --
  // ID: the ID of the assessment
  // start_range:         Integer
  // end_range:           Integer
  // page_size:           Integer - Number of records to return per page
  // page_number:         Integer
  // top_score_range_max: Integer - Max number of "Top Categories" to calculate
  // top_score_range_min: Integer - Min number of "Top Categories" to calculate
  // top_score_variance:  Integer
  // -- ERROR CODES --
  // INADEQUATE_PERMISSION, INVALID_ID
  searchResultsByAssessment: async (req, res) => {
    const allowed = await allowByPermissions(req, res, 'access_assessment_results');
    if (!allowed) { return; }

    if (req?.params?.id && !allowValidUUID(req.params.id, req, res)) { return; }

    const options = deepTrim({
      assessment_id: req.params.id,
      start_range: req.query.start_range,
      end_range: req.query.end_range,
      page_size: req.query.page_size || 10,
      page_number: req.query.page_number || 1,
      top_score_range_max: req.query.top_score_range_max || 5,
      top_score_range_min: req.query.top_score_range_min || 3,
      top_score_variance: req.query.top_score_variance || 3,
    });

    const resultValues = [ 'id', 'created_at', 'scores' ];
    const userValues = [ 'first_name', 'last_name', 'email' ];
    const offset = options.page_size * (options.page_number - 1);
    const limit = options.page_size;
    const whereBetweenValue = options.start_range && options.end_range ? 'created_at' : undefined;
    const deletedColumn = req.query.allow_deleted ? undefined : 'deleted_at';

    await Result.query()
      .skipUndefined()
      .select(resultValues)
      .where('assessment_id', '=', req.params.id)
      .whereBetween(whereBetweenValue, [ options.start_range, options.end_range ])
      .whereNull(deletedColumn)
      .limit(limit)
      .offset(offset)
      .withGraphFetched('user')
      .modifyGraph('user', (builder) => {
        builder.select(userValues);
      })

      .then(async (results) => {
        const top_max = options.top_score_range_max;
        const top_min = options.top_score_range_min;
        const top_variance = options.top_score_variance;
        results.forEach((result) => {
          result.scores = result.scores.sort((a, b) => b.score - a.score);
          result.top_scores = calculateTopScores(result.scores, top_max, top_min, top_variance);
        });

        const totalResults = await countResults(
          options.assessment_id,
          deletedColumn, {
            whereBetweenValue,
            rangeArray: [ options.start_range, options.end_range ],
          },
        );
        res.send({
          totalResults,
          results,
        });
      })
      .catch((err) => { throw [ err, 'results.searchResultsByAssessment' ]; });
  },


  // Get Result
  //
  // -- GET --
  // {API_URL}/v1/auth/results/get_result/:id
  // -- PARAMS --
  // ID: the ID of the result
  // -- ERROR CODES --
  // INADEQUATE_PERMISSION, INVALID_ID
  getResult: async (req, res) => {
    const allowed = await allowByPermissions(req, res, 'access_assessment_results');
    if (!allowed) { return; }

    if (!allowValidUUID(req.params.id, req, res)) { return; }

    const options = {
      top_score_range_max: req.query.top_score_range_max || 5,
      top_score_range_min: req.query.top_score_range_min || 3,
      top_score_variance: req.query.top_score_variance || 3,
    };

    const resultValues = [ 'id', 'created_at', 'start_utc', 'end_utc', 'scores' ];
    const userValues = [ 'first_name', 'last_name', 'email', 'dob_utc', 'gender' ];
    const assessmentValues = [ 'id', 'title', 'description', 'questions_per_category' ];
    const coachValues = [ 'id', 'first_name', 'last_name', 'email' ];

    await Result.query()
      .skipUndefined()
      .select(resultValues)
      .where('id', '=', req.params.id)
      .withGraphFetched('[user, assessment, coach]')
      .modifyGraph('user', (builder) => {
        builder.select(userValues);
      })
      .modifyGraph('assessment', (builder) => {
        builder.select(assessmentValues);
      })
      .modifyGraph('coach', (builder) => {
        builder.select(coachValues);
      })

      .then((results) => {
        const top_max = options.top_score_range_max;
        const top_min = options.top_score_range_min;
        const top_variance = options.top_score_variance;

        if (results.length < 1) {
          res.status(404);
          res.json({
            status: 'CANNOT_FIND_RESULT',
            message: 'There is no result available for the provided paremeters',
          });
          return;
        }

        results.forEach((result) => {
          result.scores = result.scores.sort((a, b) => b.score - a.score);
          result.top_scores = calculateTopScores(result.scores, top_max, top_min, top_variance);
        });
        res.send(results);
      })
      .catch((err) => { throw [ err, 'results.getResult' ]; });
  },


  // Get My Result
  //
  // -- GET --
  // {API_URL}/v1/auth/results/get_my_result/:id
  // -- PARAMS --
  // ID: the ID of the result
  getMyResult: async (req, res) => {
    const userId = await getLoggedInUser(req, [ 'id' ]);

    const options = {
      top_score_range_max: req.query.top_score_range_max || 5,
      top_score_range_min: req.query.top_score_range_min || 3,
      top_score_variance: req.query.top_score_variance || 3,
    };

    const resultValues = [ 'id', 'created_at', 'start_utc', 'end_utc', 'scores' ];
    const assessmentValues = [ 'id', 'title', 'description', 'questions_per_category' ];
    const coachValues = [ 'id', 'first_name', 'last_name', 'email' ];

    await Result.query()
      .skipUndefined()
      .select(resultValues)
      .where('id', '=', req.params.id)
      .where('user_id', '=', userId)
      .withGraphFetched('[user, assessment, coach]')
      .modifyGraph('assessment', (builder) => {
        builder.select(assessmentValues);
      })
      .modifyGraph('coach', (builder) => {
        builder.select(coachValues);
      })

      .then((results) => {
        const top_max = options.top_score_range_max;
        const top_min = options.top_score_range_min;
        const top_variance = options.top_score_variance;

        if (results.length < 1) {
          res.status(404);
          res.json({
            status: 'CANNOT_FIND_RESULT',
            message: 'There is no result available for the provided paremeters',
          });
          return;
        }

        results.forEach((result) => {
          result.scores = result.scores.sort((a, b) => b.score - a.score);
          result.top_scores = calculateTopScores(result.scores, top_max, top_min, top_variance);
        });
        res.send(results);
      })
      .catch((err) => { throw [ err, 'results.getMyResult' ]; });
  },
};

module.exports = results;
