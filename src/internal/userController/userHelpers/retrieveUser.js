import User from 'knex/models/User';
import { sha512 } from 'utils/methods/hashing';
import { eagerConstructor } from 'utils/methods/eagerConstructor';
import { fetchUsersPermissions } from '../permissionHelpers';
import { getLinkedHabiticaUser } from 'internal/habitica/core/getLinkedHabiticaUser';


export async function retrieveUser(config = {}) {
  const {
    email,
    id,
    password,
    select,
    eager,
    eagerSelects,
    allowDisabled,
  } = config;

  const eagerValues = eagerConstructor({
    user_subscriptions: true,
    ...eager,

    permissions: undefined, // we don't actually want to apply this to the query, since we have a separate function to fetch permissions.
    habitica_user: undefined, // we handle this relation separately in getLinkedHabiticaUser, so we don't want to include it in the eager loading here.
  });

  const user = await User.query()
    .modify((qb) => {
      if (id) { qb.where('users.id', '=', id); }
      if (email) { qb.where('users.email', '=', email?.toLowerCase()); }
      if (!allowDisabled) { qb.whereNull('users.disabled_at'); }

      if (password) {
        eagerValues.modify({ password: true });
        qb.where('password.password_hash', '=', sha512(password));
        qb.modifyGraph('password', (builder) => {
          builder.select([ 'password_hash' ]);
        });
      }

      if (eagerSelects) {
        eagerSelects.forEach(([ relation, fields ]) => {
          qb.modifyGraph(relation, eag => eag.select(fields));
        });
      }
    })
    .modify((qb) => {
      if (select) {
        qb.select(select.map(field => `users.${ field }`));
      }
    })
    .limit(1)
    .withGraphJoined(eagerValues.string())
    .first()
    .catch((err) => { throw [ err, 'retrieveUser' ]; });
  
  if (!user) { return undefined; }

  // If eager doesn't explicitly set permissions to false, we fetch permissions for the user.
  if (eager?.permissions !== false) {
    user.permissions = await fetchUsersPermissions(user.email, 'email');
  }

  if (eager?.habitica_user === true && user.id) {
    const habiticaUserData = await getLinkedHabiticaUser({ userId: user.id });
    user.habitica_user = habiticaUserData || null;
  }


  return user;
}
