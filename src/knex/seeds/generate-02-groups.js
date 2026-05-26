exports.seed = (knex) => {
  return knex('groups').insert([
    {
      id: '1e485ad5-adb8-48c4-8a87-660fe5462e55',
      created_at: Date.now(),
      name: 'test_group',
      description: 'This group is the initial test',
      is_deletable: true,
      permission_required_for_assignment: 'super_admin_permission_control',
    },
    {
      id: 'cd209fb3-55c7-478a-8786-104e1fd087f2',
      created_at: Date.now(),
      name: 'super_admin',
      description: 'Group to be associated with the highest level of control over the application',
      is_deletable: false,
      permission_required_for_assignment: 'super_admin_permission_control',
    },
    {
      id: 'a8b8fed4-bf2e-49f2-93f0-177fac53aa23',
      created_at: Date.now(),
      name: 'admin',
      description: 'Group associated with high level of control over the application and functionality',
      is_deletable: false,
      permission_required_for_assignment: 'super_admin_permission_control',
    },
  ])
    .then(() => knex('groups_to_permissions').insert([

      // test_group
      { // test
        group_id: '1e485ad5-adb8-48c4-8a87-660fe5462e55',
        permission_id: '7b6c8233-b1bb-498b-8db8-2116bdd87146',
      },


      // super_admin
      { // super_admin_permission_control
        group_id: 'cd209fb3-55c7-478a-8786-104e1fd087f2',
        permission_id: '36235601-f4bc-4bbe-a423-4a99cf565788',
      },
      { // admin_permission_composition
        group_id: 'cd209fb3-55c7-478a-8786-104e1fd087f2',
        permission_id: 'b780f483-8257-4c78-af11-b34608934c74', 
      },
      { // user_composition
        group_id: 'cd209fb3-55c7-478a-8786-104e1fd087f2',
        permission_id: '0490610f-12d8-4b48-add8-8d7952b13a1c',
      },
      { // super_admin_create_user
        group_id: 'cd209fb3-55c7-478a-8786-104e1fd087f2',
        permission_id: '14731d1b-29ad-4ee6-91c9-576e48e2b299',
      },
      { // admin_nav_menu
        group_id: 'cd209fb3-55c7-478a-8786-104e1fd087f2',
        permission_id: '48e6b8da-3892-4f89-8c95-b57902dac16c',
      },
      { // global_habitica_notification
        group_id: 'cd209fb3-55c7-478a-8786-104e1fd087f2',
        permission_id: '9c6f8331-b019-46a2-ab0c-97d29630ad1f',
      },


      // admin
      { // admin_permission_assignment
        group_id: 'a8b8fed4-bf2e-49f2-93f0-177fac53aa23',
        permission_id: 'a58a6c9b-8690-48dd-9f27-7f85c40f1ff3',
      },
      { // user_retrieval
        group_id: 'a8b8fed4-bf2e-49f2-93f0-177fac53aa23',
        permission_id: 'd9584539-ca70-4eb2-8828-7d90f7a9b4bf',
      },
      { // access_analytic_logs
        group_id: 'a8b8fed4-bf2e-49f2-93f0-177fac53aa23',
        permission_id: '196f6836-2dee-40ed-af73-3980feb6e65b',
      },
      { // access_error_logs
        group_id: 'a8b8fed4-bf2e-49f2-93f0-177fac53aa23',
        permission_id: '85b2b6e2-8133-4c3e-97c1-fcb9f2bd5e7c',
      },
      { // access_feedback
        group_id: 'a8b8fed4-bf2e-49f2-93f0-177fac53aa23',
        permission_id: '70110ae9-7704-4478-a0dd-4325e3ce45ee',
      },
      { // article_control
        group_id: 'a8b8fed4-bf2e-49f2-93f0-177fac53aa23',
        permission_id: 'a2633521-ed97-44a3-aec9-7397eb320f44',
      },
      { // data_manipulation
        group_id: 'a8b8fed4-bf2e-49f2-93f0-177fac53aa23',
        permission_id: 'e4d3c0f5-df2c-43ea-b857-032557d6f031',
      },
      { // access_permissions_view
        group_id: 'a8b8fed4-bf2e-49f2-93f0-177fac53aa23',
        permission_id: '1b6d0078-7f88-40cb-9c2b-ba48e903917f',
      },
      { // admin_nav_menu
        group_id: 'a8b8fed4-bf2e-49f2-93f0-177fac53aa23',
        permission_id: '48e6b8da-3892-4f89-8c95-b57902dac16c',
      },
    ]));
};
