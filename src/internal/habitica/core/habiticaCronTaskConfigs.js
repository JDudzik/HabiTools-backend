import { alertCronTaskConfigs } from 'internal/habitica/tools/alertOfToolExpirations/core/alertCronTaskConfigs';
import { autoAcceptQuestsCronTaskConfigs } from 'internal/habitica/tools/autoAcceptQuests/core/autoAcceptQuestsCronTaskConfigs';
import { autoStartQuestsCronTaskConfigs } from 'internal/habitica/tools/autoStartQuest/core/autoStartQuestsCronTaskConfigs';
import { partyPulseCronTaskConfigs } from 'internal/habitica/tools/partyPulse/core/partyPulseCronTaskConfigs';
import { questVotingCronTaskConfigs } from 'internal/habitica/tools/questVoting/core/questVotingCronTaskConfigs';


export const habiticaCronTaskConfigs = {
  ...autoAcceptQuestsCronTaskConfigs,
  ...autoStartQuestsCronTaskConfigs,
  ...partyPulseCronTaskConfigs,
  ...questVotingCronTaskConfigs,
  ...alertCronTaskConfigs,
};