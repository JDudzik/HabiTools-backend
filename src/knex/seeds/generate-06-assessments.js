exports.seed = (knex) => {
  return knex('assessments').insert([
    {
      id: '00000001-0009-4000-a000-000000000000',
      created_at: Date.now(),
      title: 'Most Important Food',
      description: 'This assessment will help you discover what the most important food in your life is!',
      assessment_type: 'accumulative',
      questions_per_category: 2,
      is_hidden: false,
    },
  ]);
};
