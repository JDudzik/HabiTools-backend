# Copilot Instructions for Gift Assessment RESTful API

## Big Picture Architecture
- **Backend (habitools-backend):** Node.js REST API, organized by version (e.g., `src/v1`). Uses PostgreSQL via Docker for local/production environments. Key directories: `src/v1`, `build/knex`, `middlewares`, `utils`.
- **Frontend:** Not covered here; see respective frontend folders for Next.js/React details.
- **Service Boundaries:** API endpoints are grouped by domain (users, articles, assessments, authentication). Permissions and groups are defined in backend logic and documented in README.

## Developer Workflows
- **Local Development:**
  1. Start PostgreSQL via Docker: `yarn db:up`, `yarn db:logs`, `yarn db:down`.
  2. Install dependencies: `yarn install`.
  3. Duplicate `.env.example` to `.env` and fill values.
  4. Seed DB: `yarn db-reset-dev`.
  5. Start server: `yarn start`.
- **Environment Variables:** Use `.env` for dev. Never commit secrets.

## Project-Specific Conventions
- **Database:** Managed via Knex migrations/seeds and models via Objection. Use provided scripts for setup/reset when necessary.

## Integration Points & External Dependencies
- **PostgreSQL:** Required for all environments; managed via Docker Compose.
- **Sendinblue:** Used for transactional emails (see README).
- **Knex:** Used for DB migrations/seeds; config in `build/knex/knexfile.js`.
- **Objection.js:** ORM for DB interactions; models in `src/knex/models`.

## Patterns & Examples
- **API:** All endpoints are under `src/v1`. These Files are only responsible for API endpoints, validation, etc.
- **Middleware:** Custom logic in `middlewares/`.
- **Utils:** Shared helpers in `utils/`.
- **Routes:** Organized by domain in `src/v1/*/routes.js`.
- **Modules:** This project uses ESmodules (import/export) throughout except in very specific scenarios. Whenever possible, look at sibling content to determine the standards of how to implement (eg: Should you use an index file? Should you `export default` or just `export`, etc).
- **Functions:** Use async/await for asynchronous code. Use arrow functions whenever possible.


## Key Files/Directories
- `src/v1/` — Main API entry points. Only responsible for API entry, validation, authorization, etc. Does not contain business logic.
`src/internal` - Most business logic lives here. Structured within `core`, `helpers`, and `methods`.
- `src/knex/knexfile.js` — DB config
- `utils/` — Shared utilities. Important ones include `allowValidUUID`, `getLoggedInUser`, `handleApiAnalytic`, `handleApiError`, and `sanitizeProperties`. Avoid adding new utilities without confirming with the user first.
- `.env.example` and `.env` — Environment variable template

---

**For any unclear or missing conventions, check README.md or ask for clarification.**
