import Article from 'knex/models/Article';
import { returnOrSendResponse, allowValidUUID } from 'utils';
import deepTrim from 'deep-trim';


export const searchArticles = async (rawOptions, req, res) => {
  // Permitted options:
  //
  // title:      Fuzzy string to search titles.
  // author_id:  The ID of the author.
  // type:       The article type to search for.
  // tags:       A JSON array of tag names to validate transactions have.
  const options = deepTrim(rawOptions);

  const defaultSelect = [
    Article.ref('id').as('id'),
    Article.ref('created_at').as('created_at'),
    'title',
    'type',
    'slug',
    'version',
    'require_simple',
    'disable_newlines',
    'deletable',
    'author_id',
  ];

  if (options?.author_id && !allowValidUUID(options.author_id, req, res)) { return; }

  let tagList = undefined;
  if (options?.tags) {
    try {
      tagList = JSON.parse(options.tags);
    } catch {
      return returnOrSendResponse(400, {
        status: 'INVALID_PROPERTIES',
        message: 'Invalid JSON array format in tag list',
      });
    }
  }

  return await Article.query()
    .select(options?.select || defaultSelect)
    .withGraphFetched('content')
    .modifyGraph('content', builder => builder.select('content'))
    .modify((qb) => {
      if (options?.title) {
        qb.where('title', 'ilike', `%${ options.title }%`);
      }
      if (options?.author_id) {
        qb.where('author_id', '=', options.author_id);
      }
      if (options?.type) {
        qb.where('type', '=', options.type);
      }
      if (tagList) {
        qb.withGraphJoined('tags');
        qb.modifyGraph('tags', (builder) => {
          builder.select([ 'created_at', 'tag' ]);
        });
        qb.whereIn('tags.tag', tagList);
      }
    })
    .then((result) => {
      if (tagList) {
        return result.filter(article => article.tags.length === tagList.length);
      }
      return result;
    })
    .catch((err) => { throw [ err, 'articles.searchArticles' ]; });
};
