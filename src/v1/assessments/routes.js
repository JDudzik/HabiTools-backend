import { bruteStopper } from 'utils';

const assessments = require('./assessments');

module.exports = (router) => {
  // const openPath = '/assessments';
  const securedPath = '/auth/assessments';

  // Brute-force prevention
  bruteStopper(router, `${ securedPath }/create`, { freeRetries: 5, minWait: 60000 });
  bruteStopper(router, `${ securedPath }/upsert/:id`, { freeRetries: 5, minWait: 60000 });

  // Secured routes
  router.post(`${ securedPath }/create`, assessments.create);
  router.get(`${ securedPath }/list`, assessments.list);
  router.get(`${ securedPath }/get_assessment/:id`, assessments.getAssessment);
  router.put(`${ securedPath }/upsert/:id`, assessments.upsert);
  router.delete(`${ securedPath }/delete/:id`, assessments.delete);

  
  return router;
};
