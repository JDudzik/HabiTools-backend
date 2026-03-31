exports.seed = (knex) => {
  return knex('articles').insert([
    {
      id: '00000001-0005-4000-a000-000000000000',
      created_at: Date.now(),
      updated_at: Date.now(),
      title: 'First simple article',
      type: 'system',
      slug: 'first-simple-article',
      version: 100,
      require_simple: true,
      disable_newlines: true,
      deletable: false,
      author_id: '00000001-0001-4000-a000-000000000000',
    },
    {
      id: '00000002-0005-4000-a000-000000000000',
      created_at: Date.now(),
      updated_at: Date.now(),
      title: 'Simple Article with Newlines',
      type: 'system',
      slug: 'simple-article-with-newlines',
      version: 5,
      require_simple: true,
      deletable: false,
      author_id: '00000001-0001-4000-a000-000000000000',
    },
    {
      id: '00000003-0005-4000-a000-000000000000',
      created_at: Date.now(),
      updated_at: Date.now(),
      title: 'Full Complex Article',
      type: 'system',
      slug: 'full-complex-article',
      version: 3,
      deletable: false,
      author_id: '00000001-0001-4000-a000-000000000000',
    },
    {
      id: '00000004-0005-4000-a000-000000000000',
      created_at: Date.now(),
      updated_at: Date.now(),
      title: 'System Alert',
      type: 'system',
      slug: 'system-alert',
      version: 1,
      deletable: false,
      author_id: '00000001-0001-4000-a000-000000000000',
    },
  ])
    .then(() => knex('article_contents').insert([
      {
        id: '00000001-0005-4000-a000-000000000000',
        content: 'This is a simple article. Its not allowed to have any kind of html or styling within it.',
      },
      {
        id: '00000002-0005-4000-a000-000000000000',
        content: 'This is another simple article except this one is allowed to have newlines.\nThus, it can be longer, but still shouldn\'t allow for a lot of complexity',
      },
      {
        id: '00000003-0005-4000-a000-000000000000',
        content: '<div>This is a <b>full article</b> with complexity <u>enabled</u>.<br/>I honestly have no idea what these will look like in the end, but this is an <i>example</i>.</div>',
      },
      {
        id: '00000004-0005-4000-a000-000000000000',
        content: '',
      },

    ]))
    .then(() => knex('article_tags').insert([
      {
        id: '00000001-0007-4000-a000-000000000000',
        created_at: Date.now(),
        tag: 'foo',
        article_id: '00000001-0005-4000-a000-000000000000',
      },
      {
        id: '00000002-0007-4000-a000-000000000000',
        created_at: Date.now(),
        tag: 'bar',
        article_id: '00000001-0005-4000-a000-000000000000',
      },
      {
        id: '00000003-0007-4000-a000-000000000000',
        created_at: Date.now(),
        tag: 'foo',
        article_id: '00000002-0005-4000-a000-000000000000',
      },
      {
        id: '00000004-0007-4000-a000-000000000000',
        created_at: Date.now(),
        tag: 'mmmm',
        article_id: '00000002-0005-4000-a000-000000000000',
      },
    ]));
};
