import { eagerConstructor } from 'utils';
import { mergedPermissions } from '../permissionHelpers';
import User from 'knex/models/User';


const parseValidatedStringAsArray = (jsonString) => {
  if (jsonString && Array.isArray(JSON.parse(jsonString))) {
    return JSON.parse(jsonString);
  }
  return undefined;
};

export async function searchUsers(searchOptions) {
  // permitted searchOptions:
  //
  // id:              ID of a User,
  // first_name:      String,
  // last_name:       String,
  // email:           String,
  // minimal_results: Only select minimal data for each returned user,
  // allow_disabled:   Also display users that have been disabled,
  // enabled_permissions:  Array of permissions to verify users DO have,
  // disabled_permissions: Array of permissions to verify users do NOT have

  const options = {
    id:            searchOptions.id,
    first_name:    `%${ searchOptions.first_name || '' }%`,
    last_name:     `%${ searchOptions.last_name || '' }%`,
    email:         `%${ searchOptions.email || '' }%`,
  };
  const minimalResults = searchOptions.minimal_results;

  const selectedValues = minimalResults
    ? [ 'id', 'first_name', 'last_name', 'email' ]
    : [
      'id',           'created_at',   'disabled_at', 'first_name',
      'last_name',    'email',
      'has_verified_email',
    ];

  const eagerValues = eagerConstructor({
    groups: [ 'permissions' ],
    permissions: true,
  });

  if (!minimalResults) {
    eagerValues.modify({
      user_subscriptions: true,
    });
  }

  return await User.query()
    .select(selectedValues)
    .modify((qb) => {
      if (!searchOptions.allow_disabled) {
        qb.whereNull('disabled_at');
      }
      if (options.id) {
        qb.where('id', '=', options.id);
      }
      if (options.first_name) {
        qb.where('first_name', 'ilike', options.first_name);
      }
      if (options.last_name) {
        qb.where('last_name', 'ilike', options.last_name);
      }
      if (options.email) {
        qb.where('email', 'ilike', options.email);
      }
    })
    .withGraphFetched(eagerValues.string())
    .modifyGraph('permissions', (builder) => {
      builder.select([ 'name', 'description' ]).whereNull('deleted_at');
    })
    .modifyGraph('groups', (builder) => {
      builder.select([ 'name', 'description' ]).whereNull('deleted_at');
    })
    .modifyGraph('groups.permissions', (builder) => {
      builder.select([ 'name', 'description' ]).whereNull('deleted_at');
    })

    .then((userList) => {
      const enabledPermissions = parseValidatedStringAsArray(searchOptions.enabled_permissions);
      const disabledPermissions = parseValidatedStringAsArray(searchOptions.disabled_permissions);

      let newUserList = [ ...userList ];

      if (enabledPermissions) {
        newUserList = newUserList.filter((user) => {
          return enabledPermissions.some((permission) => {
            return mergedPermissions(user).includes(permission);
          });
        });
      }

      if (disabledPermissions) {
        newUserList = newUserList.filter((user) => {
          return disabledPermissions.some((permission) => {
            return !mergedPermissions(user).includes(permission);
          });
        });
      }

      return newUserList;
    })

    .catch((err) => { throw [ err, 'users.searchUsers' ]; });
}
