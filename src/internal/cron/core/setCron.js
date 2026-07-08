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

const DEFAULT_PARAMETERS = {
  isActive: true,
  immediateAlways: false,
};


const stripUndefined = obj => Object.fromEntries(Object.entries(obj).filter(([ , v ]) => v !== undefined));


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
    immediateOnce,
    schedule,
    options,
    data,
    userId,
    resourceId,
    expiresAt,
    taskName,
    immediateAlways,
    isActive,
  } = topParameters;

  const isModifyingTask = !!(cronId && activeCrons[cronId]);
  const existingParameters = isModifyingTask ? activeCrons[cronId].parameters : undefined;
  if (isModifyingTask) {
    activeCrons[cronId]?.task.destroy();
  }

  const taskConfig = taskConfigs[taskName || existingParameters?.taskName];
  if (!taskConfig) {
    throw [ new Error(`Incorrect taskName provided: ${ taskName }`), 'setCron.invalidTask' ];
  }

  const derivedSchedule = schedule || existingParameters?.schedule || taskConfig?.schedule;
  if (!derivedSchedule) {
    throw [ new Error(`No schedule provided for taskName: ${ taskName }`), 'setCron.noSchedule' ];
  }
  
  const uuid = cronId || crypto.randomUUID();
  const combinedOptions = { ...DEFAULT_OPTIONS, ...taskConfig?.options, ...existingParameters?.options, ...options };
  const parameters = {
    ...DEFAULT_PARAMETERS,
    ...existingParameters,
    ...stripUndefined({
      userId,
      resourceId,
      expiresAt,
      taskName,
      immediateAlways,
      isActive,
      data: data && JSON.parse(JSON.stringify(data)),
    }),
    uuid,
    updatedAt: Date.now(),
    schedule: replaceDelay(
      replaceTimeAdjustments(
        replaceRandom(derivedSchedule),
        combinedOptions?.timezone,
      ),
      combinedOptions?.timezone,
    ),
    options: combinedOptions,
    removeThisCron: async cleanupData => await removeCron(uuid, parameters, cleanupData),
    setThisCron: async newParameters => await setCron({ ...newParameters, cronId: uuid }),
  };

  try {
    activeCrons[parameters?.uuid] = {
      parameters,
      task: cron.schedule(
        parameters?.schedule,
        cronData => withCronManager({
          parameters,
          cronData,
          job: taskConfigs[parameters?.taskName]?.job,
        }),
        parameters?.options,
      ),
      cleanup: (_, cleanupData) => taskConfigs[parameters?.taskName]?.cleanup?.(parameters, cleanupData),
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
      .catch((err) => { throw [ err, 'setCron.failedToInsertToDatabase' ]; });
  }

  if (immediateOnce || parameters?.immediateAlways || (!isModifyingTask && !fromDatabase && taskConfig?.immediateOnce)) {
    activeCrons[parameters?.uuid].task.execute();
  }

  return activeCrons[parameters?.uuid];
};