import { callHabiticaApi } from 'internal/habitica/helpers/callHabiticaApi';


export const sendPartyMessage = async ({
  userId,
  habiticaUserId,
  message,
}) => {
  if (!userId || !habiticaUserId || !message) { return false; }

  const result = await callHabiticaApi({
    method: 'POST',
    path: '/groups/party/chat',
    body: { message },
    userId,
    habiticaUserId,
    retryConfig: {
      retryOnNetworkError: true,
      retryOnRateLimit: true,
    },
  });

  return !!result?.success;
};