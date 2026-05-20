# HabiTools RESTful API
This is the backend API codebase for HabiTools, a set of tools and automations for Habitica. The goal is to create a clean interface without requiring users to install or manage scripts yourself.

The live site can be visited at [habitools.online](https://habitools.online/).


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


## License

This project is licensed under the GNU Affero General Public License v3 (AGPLv3).

You are free to use, modify, and distribute this software under the terms of the AGPLv3.

### Commercial Use

If you wish to use this software in a proprietary product, offer it as a service without releasing source code, or otherwise not comply with AGPLv3 requirements, you must obtain a commercial license.

For commercial licensing inquiries, contact: JDudzik950@gmail.com

### Contributor License Agreement (CLA)

By contributing to this project, you agree to the Contributor License Agreement (CLA).

See the `CLA.md` file for details.