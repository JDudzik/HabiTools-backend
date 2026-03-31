import { bruteStopper } from 'utils';

const emailConfirmations = require('./emailConfirmations');


module.exports = (router) => {
  const openPath = '/email_confirmations';
  // const securedPath = '/auth/email_confirmations';

  // Brute-force prevention
  bruteStopper(router, `${ openPath }/resolve/:type/:token`, { freeRetries: 10, minWait: 300000 });
  bruteStopper(router, `${ openPath }/verify/:type/:token`, { freeRetries: 30, minWait: 300000 });

  // Open routes
  router.post(`${ openPath }/resolve/:type/:token`, emailConfirmations.resolve);
  router.get(`${ openPath }/verify/:type/:token`, emailConfirmations.verify);


  return router;
};
