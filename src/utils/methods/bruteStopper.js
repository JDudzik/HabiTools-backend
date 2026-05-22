import { handleApiAnalytic } from './handleApiAnalytic';
import ExpressBrute from 'express-brute';


// options:
//    freeRetries:   The number of retires the user has before they need to start waiting (default: 2)
//    minWait:       The initial wait time (in milliseconds) after the user runs out of retries (default: 500 milliseconds)
//    maxWait:       The maximum amount of time (in milliseconds) between requests the user needs to wait (default: 15 minutes). The wait for a given request is determined by adding the time the user needed to wait for the previous two requests.
//    lifetime:      The length of time (in seconds since the last request) to remember the number of requests that have been made by an IP. By default it will be set to maxWait * the number of attempts before you hit maxWait to discourage simply waiting for the lifetime to expire before resuming an attack. With default values this is about 6 hours.
//    failCallback:  Gets called with (req, resp, nextValidRequestDate) when a request is rejected (default: ExpressBrute.FailForbidden)
//    attachResetToRequest:     Specify whether or not a simplified reset method should be attached at req.brute.reset. The simplified method takes only a callback, and resets all ExpressBrute middleware that was called on the current request. If multiple instances of ExpressBrute have middleware on the same request, only those with attachResetToRequest set to true will be reset (default: true)
//    refreshTimeoutOnRequest:  Defines whether the lifetime counts from the time of the last request that ExpressBrute didn't prevent for a given IP (true) or from of that IP's first request (false). Useful for allowing limits over fixed periods of time, for example: a limited number of requests per day. (Default: true).
//    handleStoreError:         Gets called whenever an error occurs with the persistent store from which ExpressBrute cannot recover. It is passed an object containing the properties message (a description of the message), parent (the error raised by the session store), and [key, ip] or [req, res, next] depending on whether or the error occurs during reset or in the middleware itself.


export function bruteCatcher(tableName, options) {
  const bruteStore = new ExpressBrute.MemoryStore();

  const bruteCaught = (req, res, next, nextValidRequestDate) => {
    const userEmail
      = (req.body && req.body.x_key)
      || (req.query && req.query.x_key)
      || (req.headers && req.headers['x-key'])
      || req.body.email
      || undefined;

    handleApiAnalytic(req, tableName, `{"email":"${ userEmail }"}`);
    res.status(429);
    res.json({
      status: 'TOO_MANY_ATTEMPTS',
      message: new Date(nextValidRequestDate).getTime(),
    });
    return;
  };

  return new ExpressBrute(bruteStore, { failCallback: bruteCaught, ...options });
}


/**
 * Creates an ExpressBrute instance with the given options and a custom fail callback that returns a 429 status code and logs the event for analytics.
 * @param {string} tableName - The name of the table to use for analytics logging.
 * @param {object} options - The options to configure the ExpressBrute instance.
 * @param {number} options.freeRetries - The number of retries before the user needs to start waiting (default: 2).
 * @param {number} options.minWait - The initial wait time in milliseconds after the user runs out of retries (default: 500).
 * @param {number} options.maxWait - The maximum wait time in milliseconds between requests (default: 15 minutes).
 * @param {number} options.lifetime - The length of time in seconds to remember the number of requests made by an IP (default: maxWait * attempts before maxWait).
 * @param {function} options.failCallback - A custom callback function that gets called when a request is rejected (default: ExpressBrute.FailForbidden).
 * @param {boolean} options.attachResetToRequest - Whether to attach a simplified reset method to req.brute.reset (default: true).
 * @param {boolean} options.refreshTimeoutOnRequest - Whether the lifetime counts from the time of the last request that ExpressBrute didn't prevent (default: true).
 * @param {function} options.handleStoreError - A custom callback function that gets called when an error occurs with the persistent store (default: logs the error).
 * @returns {ExpressBrute} An instance of ExpressBrute configured with the provided options and custom fail callback.
 */
export function bruteStopper(router, path, options) {
  if (process.env.NODE_ENV === 'production' || options?.enableInDev === true) {
    router.all(path, bruteCatcher(`__brute_${ path }`, options).prevent);
  }
}