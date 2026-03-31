import activeCrons from './activeCrons';


export const retrieveAllCrons = () => {
  return Object.keys(activeCrons).reduce((acc, uuid) => {
    acc[uuid] = activeCrons[uuid].parameters;
    return acc;
  }, {});
};