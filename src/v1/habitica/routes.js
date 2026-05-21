import { bruteStopper } from 'utils';
import {
  getHabitica,
  getHabiticaContentData,
  link,
  unlink,
  activateAutoAcceptQuests,
  refreshTool,
  teardownTool,
} from './habitica';


module.exports = (router) => {
  const securedPath = '/auth/habitica';

  bruteStopper(router, `${ securedPath }/content`, { freeRetries: 30, minWait: 200, maxWait: 300000 });
  bruteStopper(router, `${ securedPath }/link`, { freeRetries: 20, minWait: 500, maxWait: 300000 });
  bruteStopper(router, `${ securedPath }/unlink`, { freeRetries: 20, minWait: 200, maxWait: 300000 });
  bruteStopper(router, `${ securedPath }/tools/teardown`, { freeRetries: 30, minWait: 200, maxWait: 300000 });
  bruteStopper(router, `${ securedPath }/tools/refresh`, { freeRetries: 30, minWait: 200, maxWait: 300000 });
  bruteStopper(router, `${ securedPath }/tools/auto-accept-quests`, { freeRetries: 30, minWait: 200, maxWait: 300000 });

  router.get(`${ securedPath }`, getHabitica);
  router.post(`${ securedPath }/content`, getHabiticaContentData);
  router.post(`${ securedPath }/link`, link);
  router.delete(`${ securedPath }/unlink`, unlink);
  router.delete(`${ securedPath }/tools/teardown`, teardownTool);
  router.put(`${ securedPath }/tools/refresh`, refreshTool);
  router.post(`${ securedPath }/tools/auto-accept-quests`, activateAutoAcceptQuests);

  return router;
};
