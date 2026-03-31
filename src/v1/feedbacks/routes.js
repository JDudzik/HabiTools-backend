import { bruteStopper } from 'utils';

const feedbacks = require('./feedbacks');

module.exports = (router) => {
  const openPath = '/feedbacks';
  const securedPath = '/auth/feedbacks';

  // Brute-force prevention
  bruteStopper(router, `${ openPath }/submit`, { freeRetries: 5, minWait: 300000 });

  // Open routes
  router.post(`${ openPath }/submit`, feedbacks.submit);

  // Secured routes
  router.get(`${ securedPath }/:page`, feedbacks.allFeedbacks);
  router.get(`${ securedPath }/single-feedback/:id`, feedbacks.singleFeedback);

  return router;
};
