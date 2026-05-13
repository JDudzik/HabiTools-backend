import { deleteCrons } from './deleteCrons';


/**
 * Removes a cron by its UUID and performs cleanup if necessary.
 * @param {string} uuid - The UUID of the cron to remove.
 * @param {object} parameters - Parameters for the cron.
 * @param {object} cleanupData - Optional data for cleanup.
 * @returns {Promise<{ success: boolean, cron: object|null }>} - The result of the removal operation.
 */
export const removeCron = async (uuid, parameters, cleanupData) => {
  const deleteResult = await deleteCrons({
    id: uuid,
    parameters,
    cleanupData,
    runCleanup: true,
  }).catch((err) => { throw [ err, 'removeCron.removeFromDatabase' ]; });

  return deleteResult;
};