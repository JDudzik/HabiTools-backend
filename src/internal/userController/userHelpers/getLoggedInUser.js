import { retrieveUser } from './retrieveUser';


export async function getLoggedInUser(req, selection, config = {}) {
  if (!req) { return undefined; }
  let userEmail
    = (req.body && req.body.x_key)
    || (req.query && req.query.x_key)
    || (req.headers && req.headers['x-key'])
    || undefined;

  if (!userEmail) { return undefined; }
  userEmail = userEmail.toLowerCase();

  // If the only thing requested is the email, we can skip a database call and just return the email we extracted from the request.
  if (
    selection?.length === 1 &&
    selection[0] === 'email' &&
    Object.keys(config).length === 0
  ) { return userEmail; }

  const user = await retrieveUser({
    email: userEmail,
    ...config,
    select: [ ...(selection || []), ...(config?.select || []) ],
    eager: { permissions: false, user_subscriptions: false, ...(config?.eager || {}) },
  });

  if (!user) { return undefined; }

  if (Object.keys(user).length === 1) {
    const onlyProperty = Object.keys(user)[0];
    return user[onlyProperty];
  }
  return user;
}