import activeCrons from './activeCrons';


export const retrieveCron = (uuid) => {
  const selectedCron = activeCrons[uuid];

  if (!selectedCron) {
    throw [ new Error(`No active cron found with uuid: ${ uuid }`), 'retrieveCron' ];
  }

  return selectedCron;
};