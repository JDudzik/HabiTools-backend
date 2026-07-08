import { checkAndAlert } from './checkAndAlert';


// Note: This "tool" will only be setup once and will not be used by every user.
export const alertCronTaskConfigs = {
  'alert-of-tool-expirations-cron': {
    schedule: '20 3 */6 * * *',

    job: async (parameters, cronData) => {
      await checkAndAlert(parameters, cronData);
    },

    cleanup: () => {},
  },
};
