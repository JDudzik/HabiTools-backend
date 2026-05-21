const habiticaUserJson = require('./data/habitica-user');

exports.seed = async (knex) => {
  const asJson = value => JSON.stringify(value);
  const realUserData = habiticaUserJson?.data || {};
  const realUserStats = realUserData?.stats || {};
  const realUserAuth = realUserData?.auth || {};

  await knex('habitica_users').insert([
    {
      id: '10000004-0017-4000-a000-000000000004',
      created_at: new Date(realUserAuth?.timestamps?.created).getTime(),
      user_id: '00000001-0001-4000-a000-000000000000',
      habitica_user_id: realUserData?._id,
      is_primary: true,
    },
  ]);

  await knex('habitica_user_encrypted_keys').insert([
    {
      id: '10000004-0017-4000-a000-000000000004',
      encrypted_api_key: 'bb9ae423efd019e3fd31995cb7ff6e1589ef435676cf8c93fd53e8dc5b95fb5b:46b49dcfbb66ae39ee383e66:0329a36f7d1f7dd94f29cd5e6d97f0ec:15134ab551fe93754738d28c7d450b76073d3c9c1b0bcdb4162e1848a2c18b474fab43af',
    },
  ]);

  await knex('habitica_user_data').insert([
    {
      id: '10000004-0017-4000-a000-000000000004',
      last_updated: new Date(realUserAuth?.timestamps?.updated).getTime(),
      username: realUserAuth?.local?.username,
      email: realUserAuth?.local?.email,
      achievements: asJson(realUserData?.achievements),
      items: asJson(realUserData?.items),
      party: asJson(realUserData?.party),
      webhooks: asJson(realUserData?.webhooks),
      hp: realUserStats?.hp,
      mp: realUserStats?.mp,
      exp: realUserStats?.exp,
      gp: realUserStats?.gp,
      lvl: realUserStats?.lvl,
      class: realUserStats?.class,
      maxHealth: realUserStats?.maxHealth,
      maxMP: realUserStats?.maxMP,
      lastCron: new Date(realUserData?.lastCron).getTime(),
    },
  ]);
};
