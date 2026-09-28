import { autoAcceptQuestsWebhookTaskConfigs } from 'internal/habitica/tools/autoAcceptQuests/core/autoAcceptQuestsWebhookTaskConfigs';
import { autoStartQuestsWebhookTaskConfigs } from 'internal/habitica/tools/autoStartQuest/core/autoStartQuestsWebhookTaskConfigs';
import { questVotingWebhookTaskConfigs } from 'internal/habitica/tools/questVoting/core/questVotingWebhookTaskConfigs';

export const habiticaWebhookTaskConfigs = {
  ...autoAcceptQuestsWebhookTaskConfigs,
  ...autoStartQuestsWebhookTaskConfigs,
  ...questVotingWebhookTaskConfigs,
};