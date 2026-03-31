import Article from 'knex/models/Article';
import { handleApiAnalytic, returnOrSendResponse, allowValidUUID } from 'utils';


export const deleteArticle = async (articleId, req, res) => {
  if (!allowValidUUID(articleId)) {
    return returnOrSendResponse(404, {
      status: 'INVALID_ID',
      message: 'Invalid ID was provided',
    }, req, res);
  }

  const targetArticle = await Article.query()
    .where('id', articleId)
    .select([ 'deletable', 'version' ])
    .first();

  if (!targetArticle) {
    return returnOrSendResponse(400, {
      status: 'NO_ARTICLE_ID',
      message: 'No Article with the provided ID exists',
    }, req, res);
  }

  if (!targetArticle.deletable) {
    return returnOrSendResponse(409, {
      status: 'UNDELETABLE_RESOURCE',
      message: 'The requests resource is not allowed to be deleted',
    }, req, res);
  }

  return await Article.query()
    .patchAndFetchById(articleId, {
      deleted_at: Date.now(),
      version: targetArticle.version + 1,
    })

    .then((result) => {
      if (!result) {
        // If "result" is undefined, it means the provided ID doesn't exist in the table
        return returnOrSendResponse(400, {
          status: 'NO_ARTICLE_ID',
          message: 'No Article with the provided ID exists',
        }, req, res);
      }
      handleApiAnalytic(req, 'article_deleted', JSON.stringify(articleId));
      return result;
    })
    .catch((err) => { throw [ err, 'articles.deleteArticle' ]; });
};