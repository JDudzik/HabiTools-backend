import cron from 'node-cron';
import activeCrons from './activeCrons';
import { taskConfigs } from './taskConfigs';
import { removeCron } from './removeCron';
import { replaceRandom } from '../helpers/replaceRandom';
import { replaceTimeAdjustments } from '../helpers/replaceTimeAdjustments';
import { replaceDelay } from '../helpers/replaceDelay';
import { withCronManager, cronFailedManager } from './withCronManager';
import Cron from 'knex/models/Cron';


const DEFAULT_OPTIONS = {
  timezone: 'Etc/UTC',
  maxRandomDelay: 1000,
};

/**
 * Create or update a cron job with the given parameters.
 * @param {object} topParameters - The parameters for the cron job.
 * @param {boolean} topParameters.fromDatabase - Whether the cron is being set from the database.
 * @param {string} topParameters.cronId - Optional UUID to update an existing cron.
 * @param {string} topParameters.userId - Optional user ID associated with the cron.
 * @param {string} topParameters.resourceId - Optional resource ID associated with the cron.
 * @param {number} topParameters.expiresAt - Optional expiration time for the cron.
 * @param {string} topParameters.taskName - Name of the task to execute.
 * @param {boolean} topParameters.immediateAlways - Whether to always execute the cron immediately.
 * @param {boolean} topParameters.immediateOnce - Whether to execute the cron immediately.
 * @param {boolean} topParameters.isActive - Whether the cron is active.
 * @param {string} topParameters.schedule - Cron schedule string.
 * @param {Options} topParameters.options - Options for the cron job (optionally contains: name, timezone, noOverlap, maxExecutions, maxRandomDelay). https://www.nodecron.com/scheduling-options.html
 * @param {object} topParameters.data - Data to pass to the cron job.
 * @returns {void}
 */
export const setCron = async (topParameters) => {
  const {
    fromDatabase = false,
    cronId,
    userId,
    resourceId,
    expiresAt,
    taskName,
    immediateAlways = false,
    immediateOnce = false,
    isActive = true,
    schedule,
    options,
    data = {},
  } = topParameters;

  const taskConfig = taskConfigs[taskName];
  if (!taskConfig) {
    throw [ new Error(`Incorrect taskName provided: ${ taskName }`), 'setCron.invalidTask' ];
  }

  const derivedSchedule = schedule || taskConfig?.schedule;
  if (!derivedSchedule) {
    throw [ new Error(`No schedule provided for taskName: ${ taskName }`), 'setCron.noSchedule' ];
  }

  const isModifyingTask = !!(cronId && activeCrons[cronId]);
  if (isModifyingTask) {
    activeCrons[cronId].task.destroy();
  }
  
  const uuid = cronId || crypto.randomUUID();
  const combinedOptions = { ...DEFAULT_OPTIONS, ...taskConfig?.options, ...options };
  const parameters = {
    uuid,
    userId,
    resourceId,
    expiresAt,
    updatedAt: Date.now(),
    taskName,
    immediateAlways,
    isActive: !!isActive,
    schedule: (
      replaceDelay(
        replaceTimeAdjustments(
          replaceRandom(derivedSchedule),
          combinedOptions?.timezone,
        ),
        combinedOptions?.timezone,
      )
    ),
    options: combinedOptions,
    data: JSON.parse(JSON.stringify(data)),
    removeThisCron: cleanupData => removeCron(uuid, parameters, cleanupData),
    setThisCron: newParameters => setCron({ ...newParameters, cronId: uuid }),
  };

  try {
    activeCrons[parameters?.uuid] = {
      parameters,
      task: cron.schedule(
        parameters?.schedule,
        cronData => withCronManager({
          parameters,
          cronData,
          job: taskConfigs[taskName]?.job,
        }),
        parameters?.options,
      ),
      cleanup: (_, cleanupData) => taskConfigs[taskName]?.cleanup?.(parameters, cleanupData),
    };
    
    activeCrons[parameters?.uuid].task.on('execution:failed', ctx => cronFailedManager('execution:failed', activeCrons[parameters?.uuid], ctx));
    activeCrons[parameters?.uuid].task.on('execution:missed', ctx => cronFailedManager('execution:missed', activeCrons[parameters?.uuid], ctx));
    activeCrons[parameters?.uuid].task.on('execution:overlap', ctx => cronFailedManager('execution:overlap', activeCrons[parameters?.uuid], ctx));
    activeCrons[parameters?.uuid].task.on('execution:maxReached', ctx => cronFailedManager('execution:maxReached', activeCrons[parameters?.uuid], ctx));

  } catch (error) {
    throw [ error, 'setCron.failedCreation' ];
  }

  if (!fromDatabase) {
    const cronEntry = {
      id: parameters?.uuid,
      user_id: parameters?.userId,
      resource_id: parameters?.resourceId,
      created_at: Date.now(),
      updated_at: parameters?.updatedAt,
      deleted_at: null,
      expires_at: parameters?.expiresAt || null,
      task_name: parameters?.taskName,
      immediate_always: parameters?.immediateAlways,
      is_active: parameters?.isActive,
      schedule: parameters?.schedule,
      options: parameters?.options,
      data: parameters?.data,
    };

    await Cron.query()
      .upsertGraph(cronEntry, { insertMissing: true })
      .catch((err) => { throw [ err, 'setCron.failedDatabase' ]; });
  }

  if (immediateOnce || immediateAlways || (!isModifyingTask && !fromDatabase && taskConfig?.immediateOnce)) {
    activeCrons[parameters?.uuid].task.execute();
  }
  return activeCrons[parameters?.uuid];
};