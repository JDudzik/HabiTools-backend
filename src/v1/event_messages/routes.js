import { bruteStopper } from 'utils';

const event_messages = require('./event_messages');


module.exports = (router) => {
  // const openPath = '/event-messages';
  const securedPath = '/auth/event-messages';
  
  // Brute-force prevention
  bruteStopper(router, `${ securedPath }/create`, { freeRetries: 30 });
  bruteStopper(router, `${ securedPath }/list`, { freeRetries: 100, minWait: 50, maxWait: 1500, lifetime: 50 });
  bruteStopper(router, `${ securedPath }/acknowledge`, { freeRetries: 30 });
  bruteStopper(router, `${ securedPath }/unacknowledge`, { freeRetries: 30 });
  bruteStopper(router, `${ securedPath }/delete/:message_id`, { freeRetries: 30 });

  // Secured routes
  router.post(`${ securedPath }/create`, event_messages.create);
  router.get(`${ securedPath }/list`, event_messages.list);
  router.put(`${ securedPath }/acknowledge`, event_messages.acknowledge);
  router.put(`${ securedPath }/unacknowledge`, event_messages.unacknowledge);
  router.delete(`${ securedPath }/delete/:message_id`, event_messages.deleteMessage);
  


  return router;
};
