import { validateRequest } from './middlewares';  
import express from 'express';
import path from 'path';
import logger from 'morgan';
import bodyParser from 'body-parser';
import compression from 'compression';
import fs from 'fs';
import http from 'http';
import version1 from './v1';

import Knex from '../node_modules/knex';
import { Model } from 'objection';
import knexConfig from './knex/knexfile';

import { migrateDataLatest } from './internal/data';
import { handleApiAnalytic, handleApiError } from './utils';
import { startCronsFromDatabase, setCron } from './internal/cron';
import { stripeWebhookValidator } from './internal/commerce';


async function startServer() {
  try {
    const app = express();
    app.set('query parser', 'extended');
    const knex = Knex(knexConfig[process.env.NODE_ENV]);
    Model.knex(knex);
    await migrateDataLatest();
  
    if (process.env.NODE_ENV === 'production') {
      // If we are in production, make a larger logging format and additionally save logs to files
      const accessLogStream = fs.createWriteStream(path.join(__dirname, '../logs/access.log'), { flags: 'a' });
      const productionLoggerFormat = '[:date[clf]] ":method :url " :status :response-time ms - :res[content-length]';
      app.use(logger(productionLoggerFormat, { stream: accessLogStream }));
      app.use(logger(productionLoggerFormat));
    } else {
      // If we aren't in production, simply log a smaller version to the console
      app.use(logger('dev'));
    }
  
    app.use('/v1/commerce/stripe/webhook', stripeWebhookValidator);
    app.use(bodyParser.json());
    app.use(compression());
  
    // CORS headers
    const permittedProductionDomains = [ 'http://enveloped.app', 'http://www.enveloped.app', `${ process.env.FRONTEND_HOST }`, `${ process.env.BACKEND_HOST }` ];
    app.use((req, res, next) => {
      if (process.env.RESTRICT_CORS_ORIGINS === 'true') {
        const origin = req.headers.origin;
        if (permittedProductionDomains.includes(origin)) {
          res.header('Access-Control-Allow-Origin', origin);
        }
      } else {
        res.header('Access-Control-Allow-Origin', '*'); // Allow all origins in development
      }
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
      // Set custom headers for CORS
      res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key');
      if (req.method === 'OPTIONS') {
        res.status(200).end();
      } else {
        next();
      }
    });
  
  
    // Log most API hits
    app.use((req, res, next) => {
      const ignoredEndpoints = [ '/hog/', '/analytics/logs/', '/analytics/single-log/' ];
      const shouldIgnore = ignoredEndpoints.some(ignoredEndpoint => req.originalUrl.includes(ignoredEndpoint));
      
      if (!shouldIgnore) {
        handleApiAnalytic(req, 'api_hit', req.originalUrl); // This WILL be necessary for sorting/solving for hits on specific urls/times
      }
      next();
    });
  
    // Auth Middleware - This will check if the token is valid
    // Only the requests that start with /v1/auth/*splat will be checked for the token.
    app.all('/v1/auth/*splat', validateRequest);
  
    // All other defined routes will be added
    app.use('/v1/', version1(app));
  
    // If no route is matched by now, a user has either hit the root page or a non-existant route.
    app.use((req, res) => {
      // If a user has hit the root, then give a basic "greating" message as well as the server's time.
      if (req.originalUrl === '/') {
        return res.json({
          message: 'Welcome to the API!',
          serverTime: new Date(),
          ISOTime: new Date().toISOString(),
        });
      }
  
      // If the route is anything but the root, it must not exist and is a 404.
      res.status(404);
      res.json({
        status: 'INVALID_URL',
        message: 'URL not found',
      });
    });
  
    // Global error-handling middleware
    app.use((error, req, res, _next) => {
      handleApiError(
        error?.[0] || error,
        error?.[1] || 'unknown_source',
        { req, res },
      );
    });

    // Start the cron service
    await startCronsFromDatabase();

    // Start the cron task to alert users of expiring tools.
    await setCron({ taskName: 'alert-of-tool-expirations-cron', cronId: '7630b2d8-289a-455c-8972-d533529d71d7' });

    // Start the server
    const port = process.env.PORT || 3001;
    http.createServer(app).listen(port);
    console.log(`Server started : ${ port }`);  // eslint-disable-line no-console
  } catch (error) {
    console.error('root.trycatch error:', error);
    await handleApiError(error, 'root.trycatch');
    setTimeout(() => {
      process.exit(1);
    }, 100);
  } 
}


// Handle unhandled errors and rejections:
const handleUnhandledError = async (error, source) => {
  console.error('error:', error);
  if (error[0] && error[0] instanceof Error && error[1]) {
    await handleApiError(error[0], error[1], error[2]);
  } else {
    await handleApiError(error, source, { isFatal: true });
    process.exit(1);
  }
};

process.on('unhandledRejection', async (error) => {
  await handleUnhandledError(error, 'unhandledRejection');
});
process.on('uncaughtException', async (error) => {
  await handleUnhandledError(error, 'uncaughtException');
});

startServer();