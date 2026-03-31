// import Article from 'knex/models/Article';
import Article_Tag from 'knex/models/Article_Tag';
import deepTrim from 'deep-trim';


export const deleteTag = async (articleId, tagName) => {
  return await Article_Tag.query()
    .where('article_id', '=', articleId)
    .andWhere('tag', '=', deepTrim(tagName))
    .delete();
};


export const getTagsForArticle = async (articleId) => {
  return await Article_Tag.query()
    .where('article_id', '=', articleId)
    .select('tag');
};


export const findArticlesByTag = async (tagName) => {
  return await Article_Tag.query()
    .where('tag', '=', deepTrim(tagName))
    .select([ 'id' ])
    .withGraphFetched('[article]')
    .modifyGraph('article', eag => eag.select([ 'id', 'title', 'type', 'slug', 'version' ]));
};


export const articleAndTagObject = async (articleId, tagName) => {
  return await Article_Tag.query()
    .where('article_id', '=', articleId)
    .andWhere('tag', '=', deepTrim(tagName))
    .first();
};


export const addTag = async (articleId, tagName) => {
  if (await articleAndTagObject(articleId, deepTrim(tagName))) {
    return;
  }

  return await Article_Tag.query()
    .insert({
      created_at: Date.now(),
      tag: deepTrim(tagName),
      article_id: articleId,
    });
};