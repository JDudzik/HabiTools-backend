exports.seed = (knex) => {
  return knex('results').insert([
    {
      created_at: Date.now(),
      start_utc: Date.now() - 1000000,
      end_utc: Date.now(),
      assessment_id: '00000001-0009-4000-a000-000000000000',
      user_id: '00000001-0001-4000-a000-000000000000',
      coach_id: '00000002-0001-4000-a000-000000000000',
      scores: JSON.stringify([
        {
          category: 'tacos',
          score: 10,
        },
        {
          category: 'burritos',
          score: 5,
        },
        {
          category: 'chilly',
          score: 9,
        },
        {
          category: 'hotdogs',
          score: 7,
        },
        {
          category: 'pancakes',
          score: 4,
        },
      ]),
    },
    {
      created_at: Date.now(),
      start_utc: Date.now() - 1000000,
      end_utc: Date.now(),
      assessment_id: '00000001-0009-4000-a000-000000000000',
      user_id: '00000001-0001-4000-a000-000000000000',
      coach_id: '00000002-0001-4000-a000-000000000000',
      scores: JSON.stringify([
        {
          category: 'tacos',
          score: 4,
        },
        {
          category: 'burritos',
          score: 1,
        },
        {
          category: 'chilly',
          score: 10,
        },
        {
          category: 'hotdogs',
          score: 2,
        },
        {
          category: 'pancakes',
          score: 3,
        },
      ]),
    },
    {
      created_at: Date.now(),
      start_utc: Date.now() - 1000000,
      end_utc: Date.now(),
      assessment_id: '00000001-0009-4000-a000-000000000000',
      user_id: '00000001-0001-4000-a000-000000000000',
      coach_id: '00000002-0001-4000-a000-000000000000',
      scores: JSON.stringify([
        {
          category: 'tacos',
          score: 10,
        },
        {
          category: 'burritos',
          score: 10,
        },
        {
          category: 'chilly',
          score: 10,
        },
        {
          category: 'hotdogs',
          score: 10,
        },
        {
          category: 'pancakes',
          score: 9,
        },
      ]),
    },
    {
      created_at: Date.now(),
      start_utc: Date.now() - 1000000,
      end_utc: Date.now(),
      assessment_id: '00000001-0009-4000-a000-000000000000',
      user_id: '00000001-0001-4000-a000-000000000000',
      coach_id: '00000002-0001-4000-a000-000000000000',
      scores: JSON.stringify([
        {
          category: 'tacos',
          score: 5,
        },
        {
          category: 'burritos',
          score: 3,
        },
        {
          category: 'chilly',
          score: 2,
        },
        {
          category: 'hotdogs',
          score: 4,
        },
        {
          category: 'pancakes',
          score: 4,
        },
      ]),
    },
    {
      created_at: Date.now(),
      start_utc: Date.now() - 1000000,
      end_utc: Date.now(),
      assessment_id: '00000001-0009-4000-a000-000000000000',
      user_id: '00000001-0001-4000-a000-000000000000',
      coach_id: '00000002-0001-4000-a000-000000000000',
      scores: JSON.stringify([
        {
          category: 'tacos',
          score: 5,
        },
        {
          category: 'burritos',
          score: 3,
        },
        {
          category: 'chilly',
          score: 2,
        },
        {
          category: 'hotdogs',
          score: 4,
        },
        {
          category: 'pancakes',
          score: 4,
        },
      ]),
    },
    {
      created_at: Date.now(),
      start_utc: Date.now() - 1000000,
      end_utc: Date.now(),
      assessment_id: '00000001-0009-4000-a000-000000000000',
      user_id: '00000001-0001-4000-a000-000000000000',
      coach_id: '00000002-0001-4000-a000-000000000000',
      scores: JSON.stringify([
        {
          category: 'tacos',
          score: 5,
        },
        {
          category: 'burritos',
          score: 3,
        },
        {
          category: 'chilly',
          score: 2,
        },
        {
          category: 'hotdogs',
          score: 4,
        },
        {
          category: 'pancakes',
          score: 4,
        },
      ]),
    },
    {
      created_at: Date.now(),
      start_utc: Date.now() - 1000000,
      end_utc: Date.now(),
      assessment_id: '00000001-0009-4000-a000-000000000000',
      user_id: '00000001-0001-4000-a000-000000000000',
      coach_id: '00000002-0001-4000-a000-000000000000',
      scores: JSON.stringify([
        {
          category: 'tacos',
          score: 5,
        },
        {
          category: 'burritos',
          score: 3,
        },
        {
          category: 'chilly',
          score: 2,
        },
        {
          category: 'hotdogs',
          score: 4,
        },
        {
          category: 'pancakes',
          score: 4,
        },
      ]),
    },
    {
      created_at: Date.now(),
      start_utc: Date.now() - 1000000,
      end_utc: Date.now(),
      assessment_id: '00000001-0009-4000-a000-000000000000',
      user_id: '00000001-0001-4000-a000-000000000000',
      coach_id: '00000002-0001-4000-a000-000000000000',
      scores: JSON.stringify([
        {
          category: 'tacos',
          score: 5,
        },
        {
          category: 'burritos',
          score: 3,
        },
        {
          category: 'chilly',
          score: 2,
        },
        {
          category: 'hotdogs',
          score: 4,
        },
        {
          category: 'pancakes',
          score: 4,
        },
      ]),
    },
    {
      created_at: Date.now(),
      start_utc: Date.now() - 1500000,
      end_utc: Date.now(),
      assessment_id: '00000001-0009-4000-a000-000000000000',
      user_id: '00000003-0001-4000-a000-000000000000',
      coach_id: '00000001-0001-4000-a000-000000000000',
      scores: JSON.stringify([
        {
          category: 'tacos',
          score: 1,
        },
        {
          category: 'burritos',
          score: 5,
        },
        {
          category: 'chilly',
          score: 3,
        },
        {
          category: 'hotdogs',
          score: 2,
        },
        {
          category: 'pancakes',
          score: 3,
        },
      ]),
    },
  ]);
};
