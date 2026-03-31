import { bruteStopper } from 'utils';

const webhooks = require('./webhooks');


module.exports = (router) => {
  const openPath = '/webhooks';
  const securedPath = '/auth/webhooks';

  // Brute-force prevention
  bruteStopper(router, `${ securedPath }/list`, { freeRetries: 30, minWait: 200, maxWait: 300000 });
  bruteStopper(router, `${ securedPath }/list/:webhook_id`, { freeRetries: 30, minWait: 200, maxWait: 300000 });
  bruteStopper(router, `${ securedPath }/set`, { freeRetries: 15, minWait: 200, maxWait: 300000 });
  bruteStopper(router, `${ securedPath }/remove/:webhook_id`, { freeRetries: 30, minWait: 200, maxWait: 300000 });
  bruteStopper(router, `${ openPath }/trigger/:url_id`, { freeRetries: 30, minWait: 200, maxWait: 300000 });
  
  // Open routes:
  router.post(`${ openPath }/trigger/:url_id`, webhooks.trigger);

  // Secured Routes
  router.get(`${ securedPath }/list`, webhooks.list);
  router.get(`${ securedPath }/list/:webhook_id`, webhooks.list);
  router.post(`${ securedPath }/set`, webhooks.set);
  router.delete(`${ securedPath }/remove/:webhook_id`, webhooks.remove);


  return router;
};
