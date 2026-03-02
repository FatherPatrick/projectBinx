# projectBinx

projectBinx is an anonymous, poll-first social app with a React Native client and a Node.js + PostgreSQL backend.

## What the App Does

- Users create polls (`simple`, `slider`, `ama`) instead of long-form posts.
- Users vote and interact through comments and reactions.
- Authentication supports phone/email login, signup, forgot-password flow, and account deletion endpoint.
- Home feed supports sorting, pull-to-refresh, infinite pagination, and location-aware filtering inputs.
- AdMob is integrated on mobile, with a Home feed ad slot currently implemented as a card-styled banner.

## Monorepo Layout

- [projectBinx](projectBinx) – React Native mobile app
- [backend](backend) – Express API, PostgreSQL access layer, Swagger docs
- [docker-compose.yml](docker-compose.yml) – local DB + backend services
- [scripts](scripts) – orchestration scripts (`start:all`, `stack:down`)

## Current Feature Coverage

### Mobile (React Native)

- Auth screens: login, create account, forgot password
- Main app tabs: Home, Create Poll, Profile
- Comments screen navigation from poll interactions
- Poll feed rendering for `simple`, `slider`, and `ama`
- Feed sorting and refresh/load-more behavior
- Session restore on app launch
- AdMob SDK initialization at startup
- Home feed ad placement with loading/failure diagnostics

### Backend (Express + Postgres)

- Health endpoints: `/health`, `/health/db`
- Swagger docs endpoint: `/docs`
- Auth routes:
  - `POST /api/login`
  - `POST /api/login/new`
  - `POST /api/login/forgot`
  - `POST /api/login/delete-account`
- Poll routes:
  - create/update/delete polls
  - paged poll retrieval
  - vote submission and results retrieval
- Interactions:
  - poll comments (including nested comment support)
  - poll likes/dislikes
  - comment likes/dislikes
- AMA-specific reply gating logic in interaction layer
- Rate limiting for auth, poll mutation, comment mutation, and reaction writes
- Optional OpenAI moderation middleware path for content checks

## Tech Stack

### Mobile

- React Native `0.73.x` + TypeScript
- React Navigation (stack + bottom tabs)
- Axios for API calls
- AdMob via `react-native-google-mobile-ads`

### Backend

- Node.js + Express
- PostgreSQL (`pg`)
- `express-rate-limit`
- Swagger (`swagger-jsdoc`, `swagger-ui-express`)
- OpenAI SDK (moderation integration path)

### Local Infrastructure

- Docker Compose (Postgres + backend container)
- Root orchestration scripts for full-stack local startup

## Quick Start

### 1) Install dependencies

From repo root:

```bash
npm install
npm --prefix backend install
npm --prefix projectBinx install
```

### 2) Start DB + backend

From repo root:

```bash
npm run stack:up
```

Useful commands:

```bash
npm run stack:logs
npm run stack:down
npm run db:reset
```

### 3) Run mobile app

From [projectBinx](projectBinx):

```bash
npm start
```

In another terminal:

```bash
npm run android
# or
npm run ios
```

## One-Command Development Flows

From repo root:

- `npm run dev:all` – backend + Android app flow
- `npm run start:all` – orchestrated startup script with device/emulator helpers

## Environment

Backend uses environment variables for DB and moderation behavior. See compose defaults in [docker-compose.yml](docker-compose.yml) and backend usage in [backend/src/index.js](backend/src/index.js).

Common variables:

- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT`
- `OPENAI_MODERATION_ENABLED`
- `OPENAI_API_KEY`
- `OPENAI_MODERATION_MODEL`

Use local `.env` files for secrets and never commit real keys.

## API Docs

When backend is running locally:

- Swagger UI: `http://localhost:4000/docs`
- API health: `http://localhost:4000/health`
- DB health: `http://localhost:4000/health/db`

## Notes on Ads

- Android is currently the active AdMob setup path.
- App IDs use `~`; ad unit IDs use `/`.
- Current Home feed ad display is implemented with a card-styled banner slot for compatibility with current RN/AdMob package versions.

## Working Order TODO

- general styling
  - dark mode (settings button on profile page prolly)
- censorship (just slurs), probably serverside
- multiple language support
- ask for app ratings
  - after 10 poll posts, 25 comments
  - modal asking if they like the app or not
  - if yes, rating
  - if no, close out of modal
- make sure ads work on ios
- look into how we can support in app purchases to pay to turn off ads
- datadog for analytics
  - mock reports of analytics
- terms of service/privacy?
- look into preventing injection attacks
- define some way to deploy this reliably on vercel
