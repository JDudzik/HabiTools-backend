import Permission from 'knex/models/Permission';
import { fetchUsersPermissions } from '../../permissionHelpers';


export async function getPermissions(config) {
  const { searchText, userEmail, hasFullAccess } = config;

  const normalizedSearchText = searchText?.toLowerCase()?.trim();
  const shouldCheckPermissions = Boolean(userEmail && !hasFullAccess);
  const userPermissions = shouldCheckPermissions ? await fetchUsersPermissions(userEmail, 'email') : [];

  const query = Permission.query()
    .withGraphFetched('groups')
    .orderBy('name', 'asc');

  if (shouldCheckPermissions) {
    query.where((qb) => {
      qb.whereNull('permission_required_for_assignment')
        .orWhereIn('permission_required_for_assignment', userPermissions);
    });
  }

  if (normalizedSearchText) {
    query.whereRaw('LOWER(name) LIKE ?', [ `%${ normalizedSearchText }%` ]);
  }

  return await query.catch((err) => { throw [ err, 'getPermissions.query' ]; });
}
