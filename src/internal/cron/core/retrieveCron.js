import activeCrons from './activeCrons';


export const retrieveCron = (uuid) => {
  if (!activeCrons[uuid]) {
    throw [ new Error(`No active cron found with uuid: ${ uuid }`), 'retrieveCron' ];
  }

  return activeCrons[uuid];
};