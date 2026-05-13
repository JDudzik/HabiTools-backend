import Cron from 'knex/models/Cron';
import activeCrons from './activeCrons';


const deleteCronRecord = async (cronId) => {
  const recordsDeleted = await Cron.query()
    .where({ id: cronId })
    .whereNull('deleted_at')
    .del()
    .catch((err) => { throw [ err, 'deleteCrons.deleteCronRecord' ]; });

  return recordsDeleted > 0;
};


const cleanupActiveCron = ({ cronId, parameters, cleanupData, runCleanup }) => {
  const selectedCron = activeCrons[cronId];

  try {
    selectedCron?.task?.destroy?.();
    if (runCleanup) {
      selectedCron?.cleanup?.(parameters, cleanupData);
    }
    activeCrons[cronId] = undefined;
  } catch (error) {
    throw [ error, 'deleteCrons.cleanupActiveCron' ];
  }

  return selectedCron;
};


export const deleteCrons = async ({ id, resourceId, parameters, cleanupData, runCleanup = false }) => {
  if (!id && !resourceId) {
    return {
      crons: [],
      cron: null,
      localCronDelete: [],
      found: false,
      success: false,
    };
  }

  const crons = await Cron.query()
    .whereNull('deleted_at')
    .modify((qb) => {
      if (id) {
        qb.where('id', '=', id);
      } else if (resourceId) {
        qb.where('resource_id', '=', resourceId);
      }
    })
    .catch((err) => { throw [ err, 'deleteCrons.deleteCron.findCrons' ]; });

  const localCronDelete = await Promise.all(crons.map(async (cronEntry) => {
    cleanupActiveCron({
      cronId: cronEntry.id,
      parameters,
      cleanupData,
      runCleanup,
    });

    const success = await deleteCronRecord(cronEntry.id);
    return {
      cronId: cronEntry.id,
      found: true,
      success,
    };
  }));

  return {
    crons,
    cron: crons[0] || null,
    found: crons.length > 0,
    success: localCronDelete.some(item => item.success),
  };
};