# projectBinx

projectBinx is an anonymous, community-driven polling app

The core idea is simple:

- users create polls (not long text posts)
- users vote to surface what matters
- the community self-regulates content

## Core Concept

- **Anonymous by default**: no public identity layer in the feed.
- **Poll-first social model**: every post is a poll.
- **Community moderation**: if a poll reaches **-5 total score**, it is automatically deleted.
- **Location-aware direction**: feeds are planned to become location-restricted so users interact with nearby communities.

## Current State (MVP)

The mobile app is a React Native project located in [projectBinx](projectBinx).

Implemented foundation includes:

- login/create-account/forgot-password screens
- home feed that fetches and renders polls
- poll service for CRUD + voting + result fetch
- support for poll types: `simple`, `slider`, and `ama`

## Tech Stack

- React Native (TypeScript)
- React Navigation (stack navigation)
- Axios for API requests
- Jest + ESLint baseline tooling

## Project Structure

```text
projectBinx/
	src/
		components/pollTypes/   # Poll UI components
		screens/                # Login/Home flows
		services/               # API service layer
		types/                  # Shared poll type definitions
		data/                   # Local test data
```

## Run Locally

From the React Native app folder:

```bash
cd projectBinx
npm install
npm start
```

In a second terminal:

```bash
# Android
npm run android

# iOS (macOS only)
npm run ios
```

## Local Backend + DB (Recommended)

For a lightweight test setup that is also deployment-friendly, use Docker Compose.

For full startup (DB + backend + Android app) with one command:

```bash
npm run start:all
```

This command starts stack + Metro + Android in one console stream with prefixed logs (including live backend logs) and suppresses extra Windows console popups.

If no device is connected, it auto-starts an emulator. Optionally choose which AVD to boot:

```bash
set ANDROID_AVD_NAME=Your_AVD_Name
npm run start:all
```

From repository root:

```bash
# starts PostgreSQL + backend API
npm run stack:up
```

View logs:

```bash
npm run stack:logs
```

Stop services:

```bash
npm run stack:down
```

Reset DB (wipe volume and reseed):

```bash
npm run db:reset
```

### Environment

Backend DB settings are read from environment variables. For local compose defaults:

- `DB_NAME=projectbinx`
- `DB_USER=postgres`
- `DB_PASSWORD=postgres`
- `DB_PORT=5432`
- `POLL_BACKFILL_LATITUDE=39.8283` (optional, used to backfill existing polls missing coordinates)
- `POLL_BACKFILL_LONGITUDE=-98.5795` (optional, used to backfill existing polls missing coordinates)

You can customize these by creating a root `.env` file before running `npm run stack:up`.

## API Configuration

Update base URLs before testing live API calls:

- [projectBinx/src/uri.ts](projectBinx/src/uri.ts)
- [projectBinx/src/services/loginService.ts](projectBinx/src/services/loginService.ts)

Both files currently include placeholder domains.

## Moderation Model (Target Behavior)

Moderation is intentionally simple and transparent:

1. each poll starts at neutral score
2. users vote up/down
3. when score reaches **-5**, poll is deleted automatically

This keeps the feed community-curated without exposing identities.

## Abuse Protection (Implemented)

Backend API rate limiting is active for write-heavy routes to reduce spam.

- Global write limiter on `/api` for `POST` / `PUT` / `PATCH` / `DELETE`
- Auth-specific limits on:
  - `POST /api/login`
  - `POST /api/login/new`
  - `POST /api/login/forgot`
- Poll action limits on:

  - `POST /api/poll` (create)
  - `PUT /api/poll/update/:id`
  - `DELETE /api/poll/delete/:id`
  - `POST /api/poll/vote/:id`

- Comment/reaction limits on:
  - `POST /api/poll/comments/:id`
  - `DELETE /api/poll/comments/:pollId/:commentId`
  - `POST /api/poll/reaction/:id`
  - `DELETE /api/poll/reaction/:id`
  - `POST /api/poll/comment/reaction/:commentId`
  - `DELETE /api/poll/comment/reaction/:commentId`

When limit is exceeded, API returns `429` with a retry hint.

## Interaction APIs (Implemented)

Backend now persists comments and likes/dislikes.

- Comments:
  - `GET /api/poll/comments/:id`
  - `POST /api/poll/comments/:id`
  - `DELETE /api/poll/comments/:pollId/:commentId`
- Poll reactions:
  - `GET /api/poll/reaction/:id`
  - `POST /api/poll/reaction/:id`
  - `DELETE /api/poll/reaction/:id`
- Comment reactions:
  - `GET /api/poll/comment/reaction/:commentId`
  - `POST /api/poll/comment/reaction/:commentId`
  - `DELETE /api/poll/comment/reaction/:commentId`

## Roadmap

- enforce anonymous session/auth flow end-to-end
- implement score tracking + auto-delete at `-5`
- add geofenced/local feed support
- expand anti-abuse protections to upcoming comment/like endpoints
- improve UX for creating different poll types

## Vision

Build a lightweight, anonymous polling network where local communities decide what deserves to stay visible.
