import User from 'knex/models/User';
import { mergedPermissions } from './mergedPermissions';


export async function fetchUsersPermissions(delimiterValue, delimiter = 'email') {
  const userData = await User.query()
    .where(delimiter, delimiterValue)
    .first()
    // Eager-loaded data is separated from selected data. Therefore you can't "select" eager loaded data.
    // Instead, we "select nothing" and then let the eager loading bring in it's data by itself
    .select('')
    .withGraphFetched('[groups.permissions, permissions]')
    .modifyGraph('permissions', (builder) => {
      builder.select('name').whereNull('deleted_at');
    })
    .modifyGraph('groups', (builder) => {
      builder.select('').whereNull('deleted_at');
    })
    .modifyGraph('groups.permissions', (builder) => {
      builder.select('name').whereNull('deleted_at');
    });

  return mergedPermissions(userData);
}