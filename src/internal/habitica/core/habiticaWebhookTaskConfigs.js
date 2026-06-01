import { autoAcceptQuestsWebhookTaskConfigs } from 'internal/habitica/tools/autoAcceptQuests/core/autoAcceptQuestsWebhookTaskConfigs';
import { autoStartQuestsWebhookTaskConfigs } from 'internal/habitica/tools/autoStartQuest/core/autoStartQuestsWebhookTaskConfigs';

export const habiticaWebhookTaskConfigs = {
  ...autoAcceptQuestsWebhookTaskConfigs,
  ...autoStartQuestsWebhookTaskConfigs,
};