import { bruteStopper } from 'utils';

const results = require('./results');


module.exports = (router) => {
  // const openPath = '/results';
  const securedPath = '/auth/results';

  // Brute-force prevention
  bruteStopper(router, `${ securedPath }/create`, { freeRetries: 5, minWait: 300000 });

  // Secured routes
  router.post(`${ securedPath }/create`, results.create);
  router.get(`${ securedPath }/count_results_by_assessment/:id`, results.countResultsByAssessment);
  router.get(`${ securedPath }/search_results_by_assessment/:id`, results.searchResultsByAssessment);
  router.get(`${ securedPath }/get_result/:id`, results.getResult);
  router.get(`${ securedPath }/get_my_result/:id`, results.getMyResult);


  return router;
};
