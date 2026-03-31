const articles = require('./articles');


module.exports = (router) => {
  const openPath = '/articles';
  const securedPath = '/auth/articles';

  // Open routes
  router.get(`${ openPath }/get_article_by_id/:id`, articles.getArticleById);
  router.get(`${ openPath }/get_article_by_slug/:slug`, articles.getArticleBySlug);
  router.get(`${ openPath }/search`, articles.searchArticles);

  // Secured routes
  router.get(`${ securedPath }/list_articles{/:type}`, articles.listArticles);
  router.post(`${ securedPath }/create_article`, articles.createArticle);
  router.put(`${ securedPath }/update`, articles.updateArticles);
  router.delete(`${ securedPath }/delete/:id`, articles.deleteArticle);
  

  return router;
};
