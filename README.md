# HabiTools RESTful API

## Starting the local development environment
### 1: Start PostgreSQL:
- Recommended method, use the provided docker setup to run an instance of PostgreSQL.
  - Make sure you aready have the ability to run docker-compose locally.
  - The docker-compose file is set up to use the values in your `.env` for initializing postgres.
  - It's recommended to already have [Yarn](https://www.npmjs.com/package/yarn) installed. You can install it globally with `npm install --global yarn`.
  - Use the npm scripts `yarn db:up`, `yarn db:logs`, and `yarn db:down` to manage the postgres instance.
- Alternatively, you can run PostgreSQL directly on your local machine.
  - You can take a look at the [Initializing Postgres](./docs/initializing%20postgres.md) instructions to help with initial setup.


### 2: Start the server:
- Pre-requisite: You need your local PostgreSQL instance running.
- These instructions assume you already have `node.js` installed on your system.
- You will need [Yarn](https://www.npmjs.com/package/yarn). You can install it globally with `npm install --global yarn`.
- Install modules: `yarn install`.
- Duplicate `.env.example` file to `.env`.
  - Fill in all necessary values. Blank-out any that you don't have values for. For example: `EMAILER_API_KEY=`.
  - Make sure `NODE_ENV` is `development`.
- Create and seed the database with `yarn db-reset-dev`.
- Start the dev server: `yarn start`.


## Starting the production environment
### Running production locally:
- Pre-requisite: You need your local PostgreSQL instance running.
- Install modules: `yarn install --production`.
- Duplicate `.env.example` file to `.env`.
  - Fill in all necessary values. Blank-out any that you don't have values for. For example: `EMAILER_API_KEY=`.
  - Make sure `NODE_ENV` is `production`.
- Build with `yarn build:prod`.
- Create and seed the database:
  - Migrate: `yarn migrate:prod`
  - Seed (**Warning: This operation will erase all existing data**): `npx knex seed:run --knexfile build/knex/knexfile.js`
- Start the production server with `yarn start:prod`


### Running production with docker:
**This is the recommended method for live production and staging environments.**
- You will need a PostgreSQL instance. The recommended method is to use docker for this in production. There are many ways to accomplish pairing the database and backend, so I won't be touching on that here.
- Make sure your env variables are attached. It's recommended to NOT use an `.env` file in production as this is a security risk and maintainability liablity. Instead, use a build system or PaaS that will inject env variables into the application at build-time.
- Your first time running production this way, you should set the env variable `SEED_PRODUCTION_DANGEROUS` to `true`. This will blow away the existing data and seed it. It's important to remove this variable afterwards.
  - It is recommended to actually remove this variable entirely, don't just set it to `false`. This reduces the risk of accidentally running it again in production and losing all you data!
- The application will set it's port to 3000. It's recommended to forward this to port 3001, but any port will do.
- You'll notice there aren't any specific commands or configurations provided. That's because this application should be part of a larger system and it would get far too complex to document even the most common use-cases.


---
## Endpoint Status Codes:
// Users
- ALREADY_VERIFIED_EMAIL - This user has already verified their email address
- EMAIL_ALREADY_EXISTS   - The provided email already exists in the database
- INCORRECT_PASSWORD     - The provided password is incorrect for the requested user
- INVALID_CREDENTIALS    - The login request credentials are incorrect in some way
- INVALID_EMAIL          - The provided email address is not valid (based on either a regex or truthy check)
- NO_USER_WITH_EMAIL     - There is no user matching the provided email
- NO_USER_ID             - There is no user matching the provided ID
- NO_USER_NAME           - There is no user matching the provided name value
- PASSWORD_TOO_SHORT     - The provided password does not match minimum length for security
- PASSWORDS_CANNOT_MATCH - The old and new passwords match each other. This is not allowed
- UNPROVIDED_PASSWORD    - The request did not contain a password value
- UNVERIFIED_EMAIL       - The request cannot be completed until the user verifies their email address
- USER_IS_DELETED        - The request cannot be completed because the user has been deleted
- VERIFICATION_EMAIL_SENT - This is not an error. The verification email was sent to the email

// Articles
- CANNOT_FIND_ARTICLE - The server could not find any article data with the query (search type will be passed in response data)
- CHANGED_ARTICLE     - This is not an error. The article was found and should be updated on the client
- DELETED_ARTICLE     - The article ID/Slug requested has been deleted and should be deleted on the client side too
- NO_ARTICLE_ID       - There is no article matching the provided ID
- NO_ARTICLES_TO_LIST - There are no articles available to list with provided parameters
- SLUG_ALREADY_EXISTS - The slug that was provided already exists within the database
- UNCHANGED_ARTICLE   - This is not an error. The client and server's article version match, thus it's unchanged

// Authentication
- BAD_TOKEN_OR_KEY        - The provided token and/or key is invalid
- INADEQUATE_PERMISSION   - The user does not have the required permission for the requested action
- NO_GROUP_NAME           - The provided name for the group does not exist
- NO_PERMISSION_NAME      - The permission provided does not exist
- TOKEN_EXPIRED           - The token passed with the request is expired
- UNKNOWN_01              - Something failed in user validation. Will be logged in DB under "validateRequest: failed in try-catch"
- UNPROVIDED_KEY_OR_TOKEN - The key and/or token was not provided with the request

// Other
- API_ERROR             - The server has encountered some kind of error. Might also be a DB property validation error
- CONFIRMATION_ALREADY_COMPLETED - The confirmation has previously been completed
- CONFIRMATION_EXPIRED           - The confirmation is too old and has expired
- CONFIRMATION_INVALID           - The confirmation requested does not exist
- INCORRECT_INSERT_DATA - The request contained incorrect data required or restricted by the endpoint/model
- INCORRECT_UPDATE_DATA - The request contained incorrect data required or restricted by the endpoint/model
- INVALID_PROPERTIES    - The requester provided incorrect/missing/etc properties to the request
- INVALID_URL           - The requested URL does not exist
- INVALID_ID            - The request did not provide a correct ID. Most likely it was not a UUID.
- MISSING_VALUES        - Some required values are missing from the request
- TOO_MANY_ATTEMPTS - The user has hit the endpoint too many times (a timestamp for wait time will be in the message)
- UNDELETABLE_RESOURCE  - The request to delete a resource is not doable, as the resource is marked as not-deletable
- UNEQUAL_CATEGORIES    - The client's category data doesn't match the DB (based on lengths)
- TOO_MANY_CHARACTERS   - The provided string has too many characters
- HCAPTCHA_VERIFICATION_FAILED - The token (or lack thereof) provided from the frontend failed external verification


## License

This project is licensed under the GNU Affero General Public License v3 (AGPLv3).

You are free to use, modify, and distribute this software under the terms of the AGPLv3.

### Commercial Use

If you wish to use this software in a proprietary product, offer it as a service without releasing source code, or otherwise not comply with AGPLv3 requirements, you must obtain a commercial license.

For commercial licensing inquiries, contact: JDudzik950@gmail.com

### Contributor License Agreement (CLA)

By contributing to this project, you agree to the Contributor License Agreement (CLA).

See the `CLA.md` file for details.