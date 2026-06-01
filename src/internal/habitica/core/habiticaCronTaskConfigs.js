import { autoAcceptQuestsCronTaskConfigs } from 'internal/habitica/tools/autoAcceptQuests/core/autoAcceptQuestsCronTaskConfigs';
import { autoStartQuestsCronTaskConfigs } from 'internal/habitica/tools/autoStartQuest/core/autoStartQuestsCronTaskConfigs';

export const habiticaCronTaskConfigs = {
  ...autoAcceptQuestsCronTaskConfigs,
  ...autoStartQuestsCronTaskConfigs,
};