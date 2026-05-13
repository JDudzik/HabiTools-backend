import { bruteStopper } from 'utils';
import {
  getHabitica,
  link,
  unlink,
  createAutoAcceptQuests,
  refreshTool,
  teardownTool,
} from './habitica';


module.exports = (router) => {
  const securedPath = '/auth/habitica';

  bruteStopper(router, `${ securedPath }`, { freeRetries: 30, minWait: 200, maxWait: 300000 });
  bruteStopper(router, `${ securedPath }/link`, { freeRetries: 10, minWait: 500, maxWait: 300000 });
  bruteStopper(router, `${ securedPath }/unlink`, { freeRetries: 15, minWait: 200, maxWait: 300000 });
  bruteStopper(router, `${ securedPath }/tools/auto-accept-quests`, { freeRetries: 15, minWait: 200, maxWait: 300000 });
  bruteStopper(router, `${ securedPath }/tools/auto-accept-quests/refresh`, { freeRetries: 15, minWait: 200, maxWait: 300000 });

  router.get(`${ securedPath }`, getHabitica);
  router.post(`${ securedPath }/link`, link);
  router.delete(`${ securedPath }/unlink`, unlink);
  router.delete(`${ securedPath }/tools/teardown`, teardownTool);
  router.put(`${ securedPath }/tools/refresh`, refreshTool);
  router.post(`${ securedPath }/tools/auto-accept-quests`, createAutoAcceptQuests);

  return router;
};
