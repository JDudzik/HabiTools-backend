import Error from 'knex/models/Error';
import { getLoggedInUser } from './getLoggedInUser';
import { PostHog } from 'posthog-node';

let posthogClient = undefined;

// eslint-disable-next-line default-param-last
export async function handleApiError(error, source = 'N/A', passedOptions) {
  const options = {
    req: undefined, // The reason we allow both a req/res and skip options is because one gets passed from a middleware and the skips can be passed from the thrown error.
    res: undefined,
    skipReq: false,
    skipRes: false,
    skipPosthog: false,
    isFatal: false,
    ...passedOptions,
  };

  let userId = undefined;
  if (options.req && !options.skipReq) { userId = await getLoggedInUser(options.req, [ 'id' ]); }

  const errorStack = error?.stack ? error.stack : '';
  let errorJsonString = '';
  try {
    errorJsonString = JSON.stringify(error);
  } catch {
    return errorJsonString = '';
  }

  const errorData = {
    created_at: Date.now(),
    source: source.substring(0, 5000),
    message: `${ error }\n\n${ errorStack }`.substring(0, 5000),
    message_json: errorJsonString.substring(0, 5000),
    is_api_error: true,
    user_id: userId || undefined,
  };

  if (process.env.NODE_ENV === 'development') {
    const errorDisclaimer = options.isFatal ? '\x1b[31m------FATAL------\x1b[0m' : '------ERROR------';
    console.error(`${ errorDisclaimer }\n`, `${ source }:\n${ error }`);
  }

  if (!options.skipPosthog && process.env.POSTHOG_KEY && process.env.POSTHOG_HOST) {
    if (!posthogClient) {
      posthogClient = new PostHog(
        process.env.POSTHOG_KEY,
        { host: process.env.POSTHOG_HOST },
      );
    }
    // If the source is `uncaughtException` and the message contains `ECONNREFUSED`, we don't want to send it to PostHog.
    if ((source === 'uncaughtException' || options.isFatal) && error?.message?.includes('ECONNREFUSED')) {
      return;
    }
    
    if (!options.isFatal) {
      await posthogClient.captureException(error, userId, errorData);
    }
    if (options.isFatal) {
      await posthogClient.captureExceptionImmediate(error, userId, errorData);
      await posthogClient.shutdown();
    }
  }

  try {
    await Error.query()
      .insert(errorData)
  
      .catch(async (error) => {
        await Error.query().insert({
          created_at: Date.now(),
          source: 'handleApiError',
          message: `${ error }`,
          is_api_error: true,
        });
      });

    if (options.res && !options.skipRes) {
      options.res.status(500);
      options.res.json({
        status: 'API_ERROR',
        message: error,
      });
    }
  } catch (err) {
    // If we fail to log the error, we don't want to throw it again, so we just log it to the console.
    console.error('Failed to log error to database:', err);
    return;
  }

  return;
}
