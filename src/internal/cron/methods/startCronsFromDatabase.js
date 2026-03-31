import { setCron } from '../core/setCron';
import Cron from 'knex/models/Cron';


export const startCronsFromDatabase = async () => {
  const allCrons = await Cron.query().where({ deleted_at: null });
  const startedCrons = await Promise.all(allCrons.map(async (cronEntry) => {
    try {
      const newCron = await setCron({
        fromDatabase: true,
        cronId: cronEntry.id,
        taskName: cronEntry.task_name,
        schedule: cronEntry.schedule,
        options: cronEntry.options,
        immediateAlways: !!cronEntry.immediate_always,
        isActive: !!cronEntry.is_active,
        createdAt: cronEntry.created_at,
        updatedAt: cronEntry.updated_at,
        expiresAt: cronEntry.expires_at,
        userId: cronEntry.user_id,
        resourceId: cronEntry.resource_id,
        data: cronEntry.data,
      });
      return Promise.resolve(newCron);
    } catch (error) {
      throw [ error, 'startCronsFromDatabase.failed' ];
    }
  }));
  console.debug('Crons started from database:', startedCrons.length);
  return startedCrons;
};