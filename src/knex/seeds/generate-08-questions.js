exports.seed = (knex) => {
  return knex('questions').insert([
    {
      created_at: Date.now(),
      category: 'tacos',
      text: 'Food thats folded tastes better',
      assessment_id: '00000001-0009-4000-a000-000000000000',
    },
    {
      created_at: Date.now(),
      category: 'burritos',
      text: 'I could eat an entire burrito right now',
      assessment_id: '00000001-0009-4000-a000-000000000000',
    },
    {
      created_at: Date.now(),
      category: 'chilly',
      text: 'hot and spicy soup is delicious',
      assessment_id: '00000001-0009-4000-a000-000000000000',
    },
    {
      created_at: Date.now(),
      category: 'hotdogs',
      text: 'I prefer to have no idea what my meat is made from',
      assessment_id: '00000001-0009-4000-a000-000000000000',
    },
    {
      created_at: Date.now(),
      category: 'tacos',
      text: 'Its raining tacos - from outtada sky. tacos, no need to ask why. just open your mouth and close your eyes. ITS RAINING TACOS!',
      assessment_id: '00000001-0009-4000-a000-000000000000',
    },
    {
      created_at: Date.now(),
      category: 'burritos',
      text: 'Plenty of beans, plenty of cheese, plenty of rice, oh isn\'t nice!',
      assessment_id: '00000001-0009-4000-a000-000000000000',
    },
    {
      created_at: Date.now(),
      category: 'chilly',
      text: 'Beans, beans, they\'re good for your heart. the more you eat, the more you...',
      assessment_id: '00000001-0009-4000-a000-000000000000',
    },
    {
      created_at: Date.now(),
      category: 'hotdogs',
      text: 'The typical eating contest is my favorite meal',
      assessment_id: '00000001-0009-4000-a000-000000000000',
    },
    {
      created_at: Date.now(),
      category: 'pancakes',
      text: 'flapjacks and waffle stacks, in comparision, is just whack',
      assessment_id: '00000001-0009-4000-a000-000000000000',
    },
    {
      created_at: Date.now(),
      category: 'pancakes',
      text: 'I prefer my cake comes from a pan',
      assessment_id: '00000001-0009-4000-a000-000000000000',
    },
  ]);
};
