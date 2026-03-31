const dotenv = require('@dotenvx/dotenvx');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}


const knexConfig = {
  development: {
    client: 'postgresql',
    connection: {
      port: process.env.DEV_DB_PORT,
      host: process.env.DEV_DB_HOSTNAME,
      database: process.env.DEV_DB_DATABASE,
      user: process.env.DEV_DB_USERNAME,
      password: process.env.DEV_DB_PASSWORD,
      ssl: process.env.DEV_DB_USE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    },
    pool: { min: 0, max: 7 },
  },

  production: {
    client: 'postgresql',
    connection: {
      port: process.env.DB_PORT,
      host: process.env.DB_HOSTNAME,
      database: process.env.DB_DATABASE,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_USE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    },
    pool: { min: 0, max: 7 },
  },
};

module.exports = knexConfig;
