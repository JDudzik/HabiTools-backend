// This is a mapping of cron tasks with their configurations.
// Anytime a new function is created that should be available as a cron,
// it needs to be added here along with sensible default configuration.
import { habiticaCronTaskConfigs } from 'internal/habitica/core/habiticaCronTaskConfigs';

// Note: When using the special fuctions like `SEC(10)`, `MIN(10)`, `RAND()`, etc,
// there's a good chance the cron will be set only a few seconds/minutes into the future.
// So the task needs to be able to gracefully handle being executed immediately or multiple in a short time-frame.

// SEC(30) will adjust the seconds to be within 30 seconds of the current time (backwards or forwards).
// MIN(10) will adjust the minutes to be within 10 minutes of the current time (backwards or forwards).
// HOUR(0) will set the hour to be this current hour (backwards or forwards).
// RAND(0,29) will simply input a random number between 0 and 29. No inputs defaults to equivalen of RAND(0,59)
// DELAY(30,1) replaces the min and hour segments with a time that is 30 minutes and 1 hour in the future.

// node-cron docs: https://nodecron.com/getting-started.html
// Schedule syntax:
// ┌────────────── second (optional) -> 0-59
// │ ┌──────────── minute ------------> 0-59
// │ │ ┌────────── hour --------------> 0-23
// │ │ │ ┌──────── day of month ------> 1-31
// │ │ │ │ ┌────── month -------------> 1-12 (or names)
// │ │ │ │ │ ┌──── day of week -------> 0-7 (or names, 0 or 7 are sunday)
// │ │ │ │ │ │
// │ │ │ │ │ │
// * * * * * *

export const taskConfigs = {
  'example-logger': {
    schedule: '*/5 * * * * *',
    immediateOnce: true,
    options: {
      maxRandomDelay: 2000,
    },
    job: (parameters, cronData) => {
      if (parameters.data?.showParameters) {
        console.debug('Cron parameters:', parameters);
      }
      if (parameters.data?.showCronData) {
        console.debug('Cron data:', cronData);
      }
      if (parameters.data?.message) {
        console.debug('Message:', parameters.data?.message);
      }
      return;
    },
  },
  'example-self-destruct': {
    schedule: 'SEC(30) MIN(10) HOUR(0) RAND(0,29) * *',
    options: {
      maxRandomDelay: 5000,
    },
    immediate: true,
    job: (parameters, _cronData) => {
      console.debug('Self-destruct cron executed');
      parameters?.removeThisCron({
        example: 'example of passed cleanup data',
      });
    },
    cleanup: (parameters, cleanupData) => {
      console.debug('Self-destruct cleanup parameters:', parameters);
      console.debug('Self-destruct cleanup cleanupData:', cleanupData);
    },
  },

  ...habiticaCronTaskConfigs,
};