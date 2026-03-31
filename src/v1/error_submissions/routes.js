import { bruteStopper } from 'utils';

const error_submissions = require('./error_submissions');


module.exports = (router) => {
  const openPath = '/error-submissions';
  const securedPath = '/auth/error-submissions';
  
  // Brute-force prevention  
  bruteStopper(router, `${ openPath }/submit`, { freeRetries: 15, minWait: 120000 });


  // Open routes
  router.post(`${ openPath }/submit`, error_submissions.submit);

  
  // Secured routes  
  router.get(`${ securedPath }/errors/:page`, error_submissions.allErrors);
  router.get(`${ securedPath }/single-error/:id`, error_submissions.singleError);


  return router;
};
