import express from 'express';
import { login } from 'internal/userController';
import { bruteStopper } from 'utils';


const router = express.Router();

const importRoute = (route) => {
  return [
    new RegExp(`/v1{/:auth/}/${ route }/.+`),
    require(`./${ route }/routes`)(router),
  ];
};

export default (app) => {
  //
  // Routes that can be accessed by anyone
  //
  bruteStopper(router, '/login', { freeRetries: 15 });
  router.post('/login', login);

  //
  // Declare used routes here
  app.use(...importRoute('analytics'));
  app.use(...importRoute('articles'));
  app.use(...importRoute('commerce'));
  app.use(...importRoute('email_confirmations'));
  app.use(...importRoute('error_submissions'));
  app.use(...importRoute('event_messages'));
  app.use(...importRoute('feedbacks'));
  app.use(...importRoute('hog'));
  app.use(...importRoute('users'));
  app.use(...importRoute('webhooks'));

  return router;
};
