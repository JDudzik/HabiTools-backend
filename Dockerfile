FROM node:24.14.0-alpine

# Install dependencies
COPY package.json yarn.lock ./
RUN yarn install --production

# Copy the rest of the application and build it
COPY . .
RUN yarn build:prod

# Expose the port the app runs on
EXPOSE 3000

ENV NODE_ENV=production

# Start the application
CMD ["sh", "-c", "yarn migrate:prod && ([ \"$SEED_PRODUCTION_DANGEROUS\" = \"true\" ] && npx knex seed:run --knexfile build/knex/knexfile.js || true) && yarn start:prod"]
