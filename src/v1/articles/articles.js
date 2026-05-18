import Article from 'knex/models/Article';
import { asyncArray, allowValidUUID } from 'utils';
import { getLoggedInUser } from 'internal/userController/userHelpers';
import { allowByPermissions } from 'internal/userController';
import { 
  createArticle,
  updateArticle,
  deleteArticle,
  listArticles,
  searchArticles,
} from 'internal/articles';
import deepTrim from 'deep-trim';

// Helper function to send results
const sendResults = (res, article, byType) => {
  if (!article) {
    res.status(404).json({
      status: 'CANNOT_FIND_ARTICLE',
      message: `No article exists by that ${ byType }`,
      byType: byType,
    });
    return;
  }

  const { deleted_at, ...articleValues } = article;
  if (deleted_at) {
    res.header('Cache-Control', 'no-store').status(410).json({
      status: 'DELETED_ARTICLE',
      message: 'That article has been deleted',
    });
    return;
  }

  res.send(articleValues);
};

// API Methods
const articlesApi = {

  // Create Article
  //
  // -- POST --
  // {API_URL}/v1/articles/create_article
  // -- PARAMS --
  // title, type, slug, require_simple, disable_newlines, deletable, content, tags
  // -- REQUIRED --
  // title, type, slug, deletable
  // -- ERROR CODES --
  // SLUG_ALREADY_EXISTS
  createArticle: async (req, res) => {
    const allowed = await allowByPermissions(req, res, 'article_control');
    if (!allowed) { return; }

    const authorId = await getLoggedInUser(req, [ 'id' ]) || null;
    const createdArticle = await createArticle(deepTrim(req.body), authorId, req, res);
    if (!createdArticle) { return; }

    res.send(createdArticle);
  },

  // Update Articles
  //
  // -- PUT --
  // {API_URL}/v1/articles/update
  // -- ERROR CODES --
  // INCORRECT_UPDATE_DATA, NO_ARTICLE_ID, INVALID_ID
  // Any errors from "grabArticle"
  updateArticles: async (req, res) => {
    const allowed = await allowByPermissions(req, res, 'article_control');
    if (!allowed) { return; }

    const articlesToUpdate = req.body || [];
    const updatedArticles = await asyncArray('map', articlesToUpdate, async (article) => {
      const articleObject = await updateArticle(article.id, deepTrim(article), req);
      return articleObject;
    }).catch((err) => { throw [ err, 'articlesApi.updateArticle' ]; });

    res.send(updatedArticles);
  },

  // Delete Article
  //
  // -- DELETE --
  // {API_URL}/v1/articles/delete/:id
  // -- PARAMS --
  // ID: The id of the article to delete - REQUIRED
  // -- ERROR CODES --
  // NO_ARTICLE_ID, INVALID_ID
  deleteArticle: async (req, res) => {
    const allowed = await allowByPermissions(req, res, 'article_control');
    if (!allowed) { return; }

    const articleId = req.params.id;
    const deletedArticle = await deleteArticle(articleId, req, res);
    if (!deletedArticle) { return; }

    res.send(deletedArticle);
  },

  // Get Article by ID
  //
  // -- GET --
  // {API_URL}/v1/articles/get_article_by_id/:id
  // -- PARAMS --
  // ID: The id of the article to retrieve
  // -- ERROR CODES --
  // CANNOT_FIND_ARTICLE, DELETED_ARTICLE (from "sendResults" method)
  getArticleById: async (req, res) => {
    const articleId = req.params.id;
    if (!allowValidUUID(articleId, req, res)) { return; }

    await Article.query()
      .where('id', articleId)
      .select([ 'id', 'created_at', 'deleted_at', 'title', 'type', 'slug', 'version' ])
      .withGraphFetched('[author, content, tags]')
      .modifyGraph('author', eag => eag.select([ 'first_name', 'last_name', 'email' ]))
      .modifyGraph('content', eag => eag.select([ 'content' ]))
      .modifyGraph('tags', eag => eag.select([ 'tag' ]))
      .first()
      .then(article => sendResults(res, article, 'ID'))
      .catch((err) => { throw [ err, 'articlesApi.getArticleById' ]; });
  },

  // Get Article by Slug
  //
  // -- GET --
  // {API_URL}/v1/articles/get_article_by_slug/:slug
  // -- PARAMS --
  // slug: The slug of the article to retrieve
  // -- ERROR CODES --
  // CANNOT_FIND_ARTICLE, DELETED_ARTICLE (from "sendResults" method)
  getArticleBySlug: async (req, res) => {
    const articleSlug = deepTrim(req.params.slug);

    await Article.query()
      .where('slug', articleSlug)
      .select([ 'id', 'created_at', 'deleted_at', 'title', 'type', 'slug', 'version' ])
      .withGraphFetched('[author, content, tags]')
      .modifyGraph('author', eag => eag.select([ 'first_name', 'last_name', 'email' ]))
      .modifyGraph('content', eag => eag.select([ 'content' ]))
      .modifyGraph('tags', eag => eag.select([ 'tag' ]))
      .first()
      .then(article => sendResults(res, article, 'slug'))
      .catch((err) => { throw [ err, 'articlesApi.getArticleBySlug' ]; });
  },

  // List Articles
  //
  // -- GET --
  // {API_URL}/v1/auth/articles/list_articles{/:type}
  // -- PARAMS --
  // Type: The type of article specifically to list
  // -- ERROR CODES --
  // NO_ARTICLE_ID
  listArticles: async (req, res) => {
    const allowed = await allowByPermissions(req, res, 'article_control');
    if (!allowed) { return; }

    const options = {
      type: req.params.type,
      showDeleted: req.query.show_deleted,
    };

    const articleList = await listArticles(options, req, res);
    if (!articleList) { return; }

    res.send(articleList);
  },

  // Search Articles
  //
  // -- GET --
  // {API_URL}/v1/articles/search/
  // -- PARAMS --
  // title:      Fuzzy string to search titles.
  // author_id:  The ID of the author.
  // type:       The article type to search for.
  // tags:       A JSON array of tag names to validate transactions have.
  // -- ERROR CODES --
  // NO_ARTICLE_ID
  searchArticles: async (req, res) => {
    const options = deepTrim(req.query);
    const foundArticles = await searchArticles(options, req, res);
    if (!foundArticles) { return; }

    res.send(foundArticles);
  },
};

module.exports = articlesApi;