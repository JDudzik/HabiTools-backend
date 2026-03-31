import Article from 'knex/models/Article';
import { restrictProperties, handleApiAnalytic, returnOrSendResponse, allowValidUUID } from 'utils';
import deepTrim from 'deep-trim';


export const updateArticle = async (articleId, properties, req, res) => {
  const filteredProperties = restrictProperties(
    deepTrim(properties),
    [ 'id', 'created_at', 'deleted_at', 'updated_at', 'slug', 'version', 'require_simple', 'disable_newlines', 'author_id' ],
  );

  if (!allowValidUUID(articleId)) {
    return returnOrSendResponse(404, {
      status: 'INVALID_ID',
      message: 'Invalid ID was provided',
    }, req, res);
  }


  if (Object.keys(filteredProperties).length < 1) {
    return returnOrSendResponse(400, {
      status: 'INCORRECT_UPDATE_DATA',
      message: 'Request does not contain correct data to update',
    }, req, res);
  }

  if (!filteredProperties.title && !filteredProperties.content) {
    return returnOrSendResponse(400, {
      status: 'INCORRECT_UPDATE_DATA',
      message: 'Request does not contain correct data to update',
    }, req, res);
  }

  const oldArticle = await Article.query()
    .where('id', articleId)
    .select([ 'version', 'title' ])
    .withGraphFetched('content')
    .first();

  if (!oldArticle) {
    return returnOrSendResponse(404, {
      status: 'NO_ARTICLE_ID',
      message: 'No Article with the provided ID exists',
    }, req, res);
  }


  const finalProperties = {
    title: filteredProperties.title,
    updated_at: Date.now(),
    version: oldArticle.version + 1,
    type: filteredProperties.type,
  };

  return await Article.query()
    .patchAndFetchById(articleId, finalProperties)
    .withGraphFetched('[content]')
    .modifyGraph('content', (eag) => {
      eag.patch({ 'content': filteredProperties.content });
    })

    .then((result) => {
      const analyticData = {
        id: articleId,
        title: oldArticle.title,
        content: oldArticle.content.content,
      };
      handleApiAnalytic(req, 'article_updated', JSON.stringify(analyticData));
      return result;
    })
    .catch((err) => { throw [ err, 'articles.updateArticle' ]; } );
};