import Analytic from 'knex/models/Analytic';
import { getLoggedInUser } from './getLoggedInUser';

export async function handleApiAnalytic(req, actionName, actionValue = 'N/A', source = 'API') {
  let userId = undefined;
  if (req && typeof req === 'object') {
    userId = await getLoggedInUser(req, [ 'id' ]);
  }
  if (req && typeof req !== 'object') {
    throw new Error('the "req" parameter passed to handleApiAnalytic is not correct');
  }

  const analyticData = {
    created_at: Date.now(),
    source: source.substring(0, 255),
    action_name: actionName.substring(0, 255),
    action_value: typeof actionValue === 'object'
      ? JSON.stringify(actionValue).substring(0, 8192)
      : actionValue,
    user_id: userId || undefined,
  };

  await Analytic.query()
    .insert(analyticData)
    .catch((err) => { throw [ err, 'handleApiAnalytic' ]; });
}
