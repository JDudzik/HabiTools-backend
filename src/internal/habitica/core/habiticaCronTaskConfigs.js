import { autoAcceptQuestsCronTaskConfigs } from 'internal/habitica/tools/autoAcceptQuests/core/autoAcceptQuestsCronTaskConfigs';
import { autoStartQuestsCronTaskConfigs } from 'internal/habitica/tools/autoStartQuest/core/autoStartQuestsCronTaskConfigs';
import { partyPulseCronTaskConfigs } from 'internal/habitica/tools/partyPulse/core/partyPulseCronTaskConfigs';


export const habiticaCronTaskConfigs = {
  ...autoAcceptQuestsCronTaskConfigs,
  ...autoStartQuestsCronTaskConfigs,
  ...partyPulseCronTaskConfigs,
};