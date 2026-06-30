const posthogProxy = require('./posthogProxy');

module.exports = (router) => {
  router.use('/hog/collect/static', posthogProxy.static);
  router.use('/hog/collect/array', posthogProxy.array);
  router.use('/hog/collect', posthogProxy.ingest);

  return router;
};
