import activeCrons from './activeCrons';
import Cron from 'knex/models/Cron';


/**
 * Removes a cron by its UUID and performs cleanup if necessary.
 * @param {string} uuid - The UUID of the cron to remove.
 * @param {object} cleanupData - Optional data for cleanup.
 * @returns {void}
 */
export const removeCron = async (uuid, parameters, cleanupData) => {
  const selectedCron = activeCrons[uuid];

  try {
    // Destroy the cron task and remove it from activeCrons
    selectedCron?.task?.destroy?.();
    selectedCron?.cleanup?.(parameters, cleanupData);
    activeCrons[uuid] = undefined;
  } catch (error) {
    throw [ error, 'removeCron.removeFromActiveCrons' ];
  }

  // Update the database to set deleted_at for the cron
  const recordsPatched = await Cron.query()
    .patch({
      deleted_at: Date.now(),
      updated_at: Date.now(),
    })
    .where({ id: uuid })
    .catch((err) => { throw [ err, 'removeCron.removeFromDatabase' ]; });

  return {
    success: (!!selectedCron || recordsPatched > 0),
    cron: selectedCron,
  };
};