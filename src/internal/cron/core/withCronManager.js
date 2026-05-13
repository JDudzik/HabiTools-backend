
export const withCronManager = (config) => {
  const { parameters, cronData, job } = config;

  // If the expiration has expired, remove the cron
  if (parameters.expiresAt && Date.now() > parameters.expiresAt) {
    return parameters.removeThisCron({ fromExpiration: true });
  }

  if (!parameters.isActive) {
    return;
  }

  if (job) {
    return job(parameters, cronData);
  }

  return;
};

export const cronFailedManager = (eventLabel, cron, _ctx) => {
  if (eventLabel === 'execution:missed') {
    cron.task.execute();
  }
};