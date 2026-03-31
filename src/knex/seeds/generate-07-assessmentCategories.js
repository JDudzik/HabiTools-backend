exports.seed = (knex) => {
  return knex('assessment_categories').insert([
    {
      id: '00000001-0010-4000-a000-000000000000',
      created_at: Date.now(),
      name: 'tacos',
      assessment_id: '00000001-0009-4000-a000-000000000000',
    },
    {
      id: '00000002-0010-4000-a000-000000000000',
      created_at: Date.now(),
      name: 'burritos',
      assessment_id: '00000001-0009-4000-a000-000000000000',
    },
    {
      id: '00000003-0010-4000-a000-000000000000',
      created_at: Date.now(),
      name: 'chilly',
      assessment_id: '00000001-0009-4000-a000-000000000000',
    },
    {
      id: '00000004-0010-4000-a000-000000000000',
      created_at: Date.now(),
      name: 'hotdogs',
      assessment_id: '00000001-0009-4000-a000-000000000000',
    },
    {
      id: '00000005-0010-4000-a000-000000000000',
      created_at: Date.now(),
      name: 'pancakes',
      assessment_id: '00000001-0009-4000-a000-000000000000',
    },
  ]);
};
