import { bruteStopper } from 'utils';

const analytics = require('./analytics');


// module.exports = router;

module.exports = (router) => {
  const openPath = '/analytics';
  const securedPath = '/auth/analytics';

  // Brute-force prevention
  bruteStopper(router, `${ openPath }/submit`, { freeRetries: 15, minWait: 60000 });

  // Open routes
  router.post(`${ openPath }/submit`, analytics.submit);

  // Secured routes
  router.get(`${ securedPath }/logs/:page`, analytics.allLogs);
  router.get(`${ securedPath }/single-log/:id`, analytics.singleLog);


  return router;
};
