import HabiticaTool from 'knex/models/HabiticaTool';
import { createEventMessage } from 'internal/eventMessages/core/createEventMessage';


const FIVE_DAYS = 5 * 24 * 60 * 60 * 1000; // 5 days in milliseconds
const ONE_DAY = 24 * 60 * 60 * 1000; // 1 day in milliseconds

const generateMessage = alertType => `
**Greetings Adventurer!**

You have at least one tool on HabiTools that will expire in **${ alertType === 'five_days' ? '5 days' : '1 day' }**. If a tool expires, it will automatically become inactive and you will lose any data associated with it.

**Keeping tools active is extremely easy:**
- Log into [HabiTools.online](https://habitools.online/).
- Open each tool you're using and click "Refresh Expiration". That's it!

Have a great day!
`;


export const checkAndAlert = async (parameters) => {
  const activeTools = await HabiticaTool.query()
    .alias('tool')
    .whereNull('deleted_at')
    .where('tool.expires_at', '<=', Date.now() + FIVE_DAYS)
    .select('id', 'habitica_user_id', 'tool_slug', 'expires_at')
    .withGraphFetched('[habitica_user]');

  const toolNotificationHistory = parameters.data?.toolNotificationHistory || {};
  const usersToAlert = {};
  activeTools.forEach((tool) => {
    const lastNotified = toolNotificationHistory[tool.id];
    if (
      tool.expires_at <= Date.now() + FIVE_DAYS &&
      (!lastNotified || lastNotified <= Date.now() - FIVE_DAYS)
    ) {
      usersToAlert[tool.habitica_user.user_id] = 'five_days';
      toolNotificationHistory[tool.id] = Date.now();
    }

    if (
      tool.expires_at <= Date.now() + ONE_DAY &&
      (!lastNotified || lastNotified <= Date.now() - ONE_DAY)
    ) {
      usersToAlert[tool.habitica_user.user_id] = 'one_day';
      toolNotificationHistory[tool.id] = Date.now();
    }
  });

  Object.keys(usersToAlert).forEach((userId) => {
    createEventMessage({
      userId: userId,
      eventSlug: 'tool-expiration-alert',
      eventName: 'Tool Expiration Alert',
      messageText: generateMessage(usersToAlert[userId]),
      shortMessage: 'Tool Expiration Alert',
      priority: 2,
      shouldNotify: true,
      shouldNotifyHabiticaViaAdmin: true,
    }).catch(() => {});
  });

  await parameters?.setThisCron({
    data: {
      toolNotificationHistory,
    },
  });

  return { success: true };
};
