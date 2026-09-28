import { bruteStopper } from 'utils';
import {
  getHabitica,
  getHabiticaContentData,
  link,
  unlink,
  sendGlobalNotification,
  getPartyInfo,
  refreshTool,
  teardownTool,
} from './habitica';
import {
  activateAutoAcceptQuests,
  activateAutoStartQuests,
  modifyAutoStartQuestsTool,
  activatePartyPulse,
  modifyPartyPulseTool,
  partyBroadcast,
  activateQuestVoting,
  modifyQuestVoting,
  getQuestVotingState,
  disableQuestVoting,
  pauseQuestVoting,
  unpauseQuestVoting,
  voteQuestVoting,
} from './habiticaTools';


module.exports = (router) => {
  const securedPath = '/auth/habitica';

  bruteStopper(router, `${ securedPath }/content`, { freeRetries: 30, minWait: 200, maxWait: 300000 });
  bruteStopper(router, `${ securedPath }/link`, { freeRetries: 20, minWait: 500, maxWait: 300000 });
  bruteStopper(router, `${ securedPath }/unlink`, { freeRetries: 20, minWait: 200, maxWait: 300000 });
  bruteStopper(router, `${ securedPath }/tools/teardown`, { freeRetries: 30, minWait: 200, maxWait: 300000 });
  bruteStopper(router, `${ securedPath }/tools/refresh`, { freeRetries: 30, minWait: 200, maxWait: 300000 });
  bruteStopper(router, `${ securedPath }/tools/auto-accept-quests`, { freeRetries: 30, minWait: 200, maxWait: 300000 });
  bruteStopper(router, `${ securedPath }/tools/auto-start-quests`, { freeRetries: 30, minWait: 200, maxWait: 300000 });
  bruteStopper(router, `${ securedPath }/tools/auto-start-quests/edit`, { freeRetries: 30, minWait: 200, maxWait: 300000 });
  bruteStopper(router, `${ securedPath }/tools/party-pulse`, { freeRetries: 30, minWait: 200, maxWait: 300000 });
  bruteStopper(router, `${ securedPath }/tools/party-pulse/edit`, { freeRetries: 30, minWait: 200, maxWait: 300000 });
  bruteStopper(router, `${ securedPath }/tools/quest-voting`, { freeRetries: 30, minWait: 200, maxWait: 300000 });
  bruteStopper(router, `${ securedPath }/tools/quest-voting/edit`, { freeRetries: 30, minWait: 200, maxWait: 300000 });
  bruteStopper(router, `${ securedPath }/tools/quest-voting/state`, { freeRetries: 30, minWait: 200, maxWait: 300000 });
  bruteStopper(router, `${ securedPath }/tools/quest-voting/disable`, { freeRetries: 30, minWait: 200, maxWait: 300000 });
  bruteStopper(router, `${ securedPath }/tools/quest-voting/pause`, { freeRetries: 30, minWait: 200, maxWait: 300000 });
  bruteStopper(router, `${ securedPath }/tools/quest-voting/unpause`, { freeRetries: 30, minWait: 200, maxWait: 300000 });
  bruteStopper(router, '/habitica/tools/quest-voting/vote', { freeRetries: 40, minWait: 200, maxWait: 300000 });
  bruteStopper(router, `${ securedPath }/party`, { freeRetries: 30, minWait: 200, maxWait: 300000 });
  bruteStopper(router, `${ securedPath }/party-broadcast`, { freeRetries: 20, minWait: 500, maxWait: 300000 });
  bruteStopper(router, `${ securedPath }/global-notification`, { freeRetries: 20, minWait: 1000, maxWait: 300000 });

  router.get(`${ securedPath }`, getHabitica);
  router.post(`${ securedPath }/content`, getHabiticaContentData);
  router.post(`${ securedPath }/link`, link);
  router.delete(`${ securedPath }/unlink`, unlink);
  router.delete(`${ securedPath }/tools/teardown`, teardownTool);
  router.put(`${ securedPath }/tools/refresh`, refreshTool);
  router.post(`${ securedPath }/tools/auto-accept-quests`, activateAutoAcceptQuests);
  router.post(`${ securedPath }/tools/auto-start-quests`, activateAutoStartQuests);
  router.put(`${ securedPath }/tools/auto-start-quests/edit`, modifyAutoStartQuestsTool);
  router.post(`${ securedPath }/tools/party-pulse`, activatePartyPulse);
  router.put(`${ securedPath }/tools/party-pulse/edit`, modifyPartyPulseTool);
  router.post(`${ securedPath }/tools/quest-voting`, activateQuestVoting);
  router.put(`${ securedPath }/tools/quest-voting/edit`, modifyQuestVoting);
  router.get(`${ securedPath }/tools/quest-voting/state`, getQuestVotingState);
  router.delete(`${ securedPath }/tools/quest-voting/disable`, disableQuestVoting);
  router.put(`${ securedPath }/tools/quest-voting/pause`, pauseQuestVoting);
  router.put(`${ securedPath }/tools/quest-voting/unpause`, unpauseQuestVoting);
  router.get('/habitica/tools/quest-voting/vote', voteQuestVoting);
  router.get(`${ securedPath }/party`, getPartyInfo);
  router.post(`${ securedPath }/party-broadcast`, partyBroadcast);
  router.post(`${ securedPath }/global-notification`, sendGlobalNotification);

  return router;
};
