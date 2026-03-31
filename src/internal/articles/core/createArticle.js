import { transaction } from 'objection';
import Article from 'knex/models/Article';
import { restrictProperties, returnOrSendResponse } from 'utils';
import deepTrim from 'deep-trim';


export const createArticle = async (properties, authorId, req, res) => {
  const filteredProperties = restrictProperties(
    deepTrim(properties),
    [ 'id', 'created_at', 'deleted_at', 'updated_at', 'version', 'author_id', 'tags', 'content' ],
  );

  const creationUtc = Date.now();
  const graph = {
    ...filteredProperties,
    created_at: creationUtc,
    updated_at: creationUtc,
    version: 1,
    author_id: authorId,
    content: {
      content: properties.content,
    },
    tags: properties.tags && properties.tags.map(tag => ({
      created_at: creationUtc,
      tag: tag,
    })),
  };

  if (Object.keys(filteredProperties).length < 1) {
    return returnOrSendResponse(400, {
      status: 'INCORRECT_INSERT_DATA',
      message: 'Request does not contain correct data to insert',
    }, req, res);
  }

  return await transaction(Article.knex(), (trx) => {
    return (
      Article.query(trx)
      // For security reasons, limit the relations that can be upserted.
        .allowGraph('[content, tags]')
        .insertGraph(graph)
    );
  })
    .then(upsertedData => upsertedData)
    .catch((err) => {
      if (err.errno === 19) {
        // errno 19 means a unique field already exists
        return returnOrSendResponse(409, {
          status: 'SLUG_ALREADY_EXISTS',
          message: 'The provided slug already exists in the database',
        }, req, res);
      }
      throw [ err, 'articles.createArticle' ];
    });
};