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
    {
      id: 'd796662c-e5e9-485c-ab6b-878e1d2cb916',
      created_at: Date.now(),
      name: 'assessment_manager',
      description: 'Group associated with users that have permissions to create and manage assessments, but are not themselves coaches',
      is_deletable: false,
      permission_required_for_assignment: 'admin_permission_assignment',
    },
    {
      id: 'adf42a55-883a-46a9-9745-e50f12da7e1d',
      created_at: Date.now(),
      name: 'coach_manager',
      description: 'Group associated with users that have permissions to control coaches, but are not themselves coaches',
      is_deletable: false,
      permission_required_for_assignment: 'admin_permission_assignment',
    },
    {
      id: 'e78759d2-280e-430e-a649-a094f0b98215',
      created_at: Date.now(),
      name: 'coach',
      description: 'Group associated with users assigned as coaches',
      is_deletable: false,
      permission_required_for_assignment: 'coach_assigner',
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
      { // admin_permission_assignment
        group_id: 'cd209fb3-55c7-478a-8786-104e1fd087f2',
        permission_id: 'a58a6c9b-8690-48dd-9f27-7f85c40f1ff3',
      },
      { // admin_permission_composition
        group_id: 'cd209fb3-55c7-478a-8786-104e1fd087f2',
        permission_id: 'b780f483-8257-4c78-af11-b34608934c74', 
      },
      { // user_retrieval
        group_id: 'cd209fb3-55c7-478a-8786-104e1fd087f2',
        permission_id: 'd9584539-ca70-4eb2-8828-7d90f7a9b4bf',
      },
      { // user_composition
        group_id: 'cd209fb3-55c7-478a-8786-104e1fd087f2',
        permission_id: '0490610f-12d8-4b48-add8-8d7952b13a1c',
      },
      { // access_analytic_logs
        group_id: 'cd209fb3-55c7-478a-8786-104e1fd087f2',
        permission_id: '196f6836-2dee-40ed-af73-3980feb6e65b',
      },
      { // access_error_logs
        group_id: 'cd209fb3-55c7-478a-8786-104e1fd087f2',
        permission_id: '85b2b6e2-8133-4c3e-97c1-fcb9f2bd5e7c',
      },
      { // access_assessment_results
        group_id: 'cd209fb3-55c7-478a-8786-104e1fd087f2',
        permission_id: '93613179-3185-43a2-b840-edbbbca53240',
      },
      { // access_feedback
        group_id: 'cd209fb3-55c7-478a-8786-104e1fd087f2',
        permission_id: '70110ae9-7704-4478-a0dd-4325e3ce45ee',
      },
      { // super_admin_create_user
        group_id: 'cd209fb3-55c7-478a-8786-104e1fd087f2',
        permission_id: '14731d1b-29ad-4ee6-91c9-576e48e2b299',
      },
      { // article_control
        group_id: 'cd209fb3-55c7-478a-8786-104e1fd087f2',
        permission_id: 'a2633521-ed97-44a3-aec9-7397eb320f44',
      },
      { // control_coaches
        group_id: 'cd209fb3-55c7-478a-8786-104e1fd087f2',
        permission_id: 'ce129f53-39cd-4936-97de-7161c9d3f091',
      },
      { // coach_assigner
        group_id: 'cd209fb3-55c7-478a-8786-104e1fd087f2',
        permission_id: '37be29c8-919f-496e-a93e-06f02211ac22',
      },
      { // data_manipulation
        group_id: 'cd209fb3-55c7-478a-8786-104e1fd087f2',
        permission_id: 'e4d3c0f5-df2c-43ea-b857-032557d6f031',
      },
      { // assessment_creation
        group_id: 'cd209fb3-55c7-478a-8786-104e1fd087f2',
        permission_id: 'f81c6719-f39d-450c-aec7-ae8a0120cf63',
      },
      { // access_permissions_view
        group_id: 'cd209fb3-55c7-478a-8786-104e1fd087f2',
        permission_id: '1b6d0078-7f88-40cb-9c2b-ba48e903917f',
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
      { // access_assessment_results
        group_id: 'a8b8fed4-bf2e-49f2-93f0-177fac53aa23',
        permission_id: '93613179-3185-43a2-b840-edbbbca53240',
      },
      { // access_feedback
        group_id: 'a8b8fed4-bf2e-49f2-93f0-177fac53aa23',
        permission_id: '70110ae9-7704-4478-a0dd-4325e3ce45ee',
      },
      { // article_control
        group_id: 'a8b8fed4-bf2e-49f2-93f0-177fac53aa23',
        permission_id: 'a2633521-ed97-44a3-aec9-7397eb320f44',
      },
      { // control_coaches
        group_id: 'a8b8fed4-bf2e-49f2-93f0-177fac53aa23',
        permission_id: 'ce129f53-39cd-4936-97de-7161c9d3f091',
      },
      { // data_manipulation
        group_id: 'a8b8fed4-bf2e-49f2-93f0-177fac53aa23',
        permission_id: 'e4d3c0f5-df2c-43ea-b857-032557d6f031',
      },
      { // access_permissions_view
        group_id: 'a8b8fed4-bf2e-49f2-93f0-177fac53aa23',
        permission_id: '1b6d0078-7f88-40cb-9c2b-ba48e903917f',
      },


      // assessment_manager
      { // assessment_control
        group_id: 'd796662c-e5e9-485c-ab6b-878e1d2cb916',
        permission_id: '7ea9d26f-7267-4caa-81a9-8cb5751cd84c',
      },
      { // access_assessment_results
        group_id: 'd796662c-e5e9-485c-ab6b-878e1d2cb916',
        permission_id: '93613179-3185-43a2-b840-edbbbca53240',
      },
      { // assessment_creation
        group_id: 'd796662c-e5e9-485c-ab6b-878e1d2cb916',
        permission_id: 'f81c6719-f39d-450c-aec7-ae8a0120cf63',
      },
      { // view_hidden_assessments
        group_id: 'd796662c-e5e9-485c-ab6b-878e1d2cb916',
        permission_id: '2c3d4182-6835-457d-814f-a76dc5527dfd',
      },
      

      // coach_manager
      { // control_coaches
        group_id: 'adf42a55-883a-46a9-9745-e50f12da7e1d',
        permission_id: 'ce129f53-39cd-4936-97de-7161c9d3f091',
      },
      { // coach_assigner
        group_id: 'adf42a55-883a-46a9-9745-e50f12da7e1d',
        permission_id: '37be29c8-919f-496e-a93e-06f02211ac22',
      },
      { // access_permissions_view
        group_id: 'adf42a55-883a-46a9-9745-e50f12da7e1d',
        permission_id: '1b6d0078-7f88-40cb-9c2b-ba48e903917f',
      },
      { // user_retrieval
        group_id: 'adf42a55-883a-46a9-9745-e50f12da7e1d',
        permission_id: 'd9584539-ca70-4eb2-8828-7d90f7a9b4bf',
      },


      // "coach" permissions
      { // is_coach
        group_id: 'e78759d2-280e-430e-a649-a094f0b98215',
        permission_id: 'b7a55959-c5cb-4426-a89d-917035aafd0e',
      },
    ]));
};
