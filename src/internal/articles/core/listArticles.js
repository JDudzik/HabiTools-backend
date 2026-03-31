import Article from 'knex/models/Article';
import { returnOrSendResponse } from 'utils';


export const listArticles = async (options, req, res) => {
  const articles = await Article.query()
    .modify((qb) => {
      if (!options.showDeleted) {
        qb.whereNull('deleted_at');
      }
      if (options.type) {
        qb.where('type', '=', options.type);
      }
    })
    .select([ 'id', 'created_at', 'updated_at', 'title', 'type', 'slug', 'version', 'deletable' ])
    .catch((err) => { throw [ err, 'articles.listArticles' ]; });


  if (!articles || articles.length <= 0) {
    return returnOrSendResponse(404, {
      status: 'NO_ARTICLES_TO_LIST',
      message: 'There are no articles available to list with provided parameters',
    }, req, res);
  }

  return articles;
};
