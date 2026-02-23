# projectBinx Mobile App

React Native client for projectBinx, an anonymous poll-first social app.

## Product Principles

- Anonymous interactions
- Poll-only content model
- Community self-regulation
- Planned location-restricted feeds

Moderation target behavior: any poll that reaches **-5 score** is auto-deleted.

## Current Features

- Authentication flow screens (`Login`, `CreateAccount`, `ForgotPassword`)
- Home poll feed with dynamic poll rendering
- Poll API service (`getPagedPolls`, `postPoll`, `voteById`, etc.)
- Poll type foundations: `simple`, `slider`, and typed support for `multi`

## Run the App

```bash
npm install
npm start
```

In another terminal:

```bash
# Android
npm run android

# iOS (macOS only)
npm run ios
```

## One-Command Full Startup (Backend + Android)

From the repository root (`projectBinx/`), run:

```bash
npm run dev:all
```

This starts:

- backend API (`backend` service in dev mode)
- React Native Android app launch (`projectBinx` app)

## Windows Android Notes

- Android builds use JDK 17.
- This project pins Gradle Java in [android/gradle.properties](android/gradle.properties) via `org.gradle.java.home`, so you should not need to set `JAVA_HOME` manually each run.
- If you recently changed system environment variables, fully restart VS Code/terminals once so new sessions pick them up.
- If Android Studio is open, ensure the SDK is installed and an emulator is created/started in Device Manager.

## Configure API Endpoints

Set your backend URL in:
- [src/uri.ts](src/uri.ts)

The app currently uses a placeholder domain and should be updated before real API testing.

## Test Login Credentials

While backend auth is not wired, login uses seeded mock users in `src/data/testData.ts`.

- Phone: `5550001111`
- Password: `TestPass123!`

- Phone: `5550002222`
- Password: `PollsRock456!`

## Scripts

- `npm start` - start Metro bundler
- `npm run android` - run Android app
- `npm run ios` - run iOS app
- `npm test` - run Jest tests
- `npm run lint` - run ESLint

## Backend Foundation (Implemented)

Backend scaffolding now exists in [../backend](../backend) with the requested stack:

- Node.js + Express API
- PostgreSQL connection via `pg`
- Swagger UI docs via `swagger-ui-express` + `swagger-jsdoc`

### Run Backend Locally

From the repository root:

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Backend URLs:

- API health: `http://localhost:4000/health`
- DB health: `http://localhost:4000/health/db`
- Swagger docs: `http://localhost:4000/docs`

## Working Order TODO

### Core App Wiring

- [ ] Replace placeholder API base URL in [src/uri.ts](src/uri.ts) with real backend URL
- [ ] Add environment-based API configuration for local, staging, and production
- [ ] Confirm Android and iOS can both reach backend endpoints from device/emulator

### Authentication Basics

- [ ] Persist auth/session token securely after login
- [ ] Add auto-login check on app launch when session is valid
- [ ] Add logout flow and clear session data on logout
- [ ] Route authenticated users to `Home` and unauthenticated users to `Login`

### Poll Feed and Voting

- [ ] Replace mock feed mode with real API mode for integration testing
- [ ] Confirm vote payload contract with backend (`optionId` vs index)
- [ ] Add feed empty-state and retry state for failed requests
- [ ] Fetch and show updated poll results after successful vote

### Create Account and Forgot Password

- [ ] Validate phone number format before submit
- [ ] Show backend validation messages directly when available
- [ ] Complete password reset confirmation flow (code/link + new password)

### Data and Types

- [ ] Align poll option IDs across frontend models and backend DTOs
- [ ] Add response type models for poll list, vote, and results endpoints
- [ ] Remove remaining fallback `any` usage as backend contracts become stable

### Quality and Release Readiness

- [ ] Add basic integration tests for login, create account, feed load, and voting
- [ ] Add app-level error boundary / global crash-safe fallback UI
- [ ] Add telemetry/logging for auth failures and vote failures
- [ ] Create release checklist (app icons, bundle IDs, signing, env config, smoke test)

### Product Roadmap Items

- [ ] Implement score persistence and `-5` auto-delete backend logic
- [ ] Add location-based feed filtering/geofencing
- [ ] Add anti-spam and anti-abuse protections

## Backend Build Plan (From Mock to Real)

This app currently relies on mock test data for parts of auth/feed behavior. The plan below defines how to move to a production-ready backend in controlled phases.

### Phase 0 - Architecture + Contracts

- [x] Choose backend stack and deployment target (Node + Postgres selected)
- [ ] Define environments: local, staging, production
- [x] Publish API contract (Swagger foundation + docs endpoint created)
- [ ] Lock vote payload contract (index vs optionId, slider value range, multi-select shape)

### Phase 1 - Data Model + Persistence

- [ ] Create core tables/collections:
	- users
	- sessions/tokens
	- polls
	- poll_options
	- poll_votes
	- poll_results_aggregate (or query strategy)
	- moderation_events
- [ ] Add migrations and seed scripts for local/staging data
- [ ] Enforce constraints (unique vote per user+poll, valid option references, soft/hard delete rules)

### Phase 2 - Authentication + Session

- [ ] Implement endpoints:
	- `POST /login`
	- `POST /login/new`
	- `POST /login/forgot`
	- `POST /logout` (new)
	- `GET /session/me` (new)
- [ ] Add secure token lifecycle (access + refresh token)
- [ ] Add request auth middleware and protected route checks

### Phase 3 - Poll CRUD + Feed

- [ ] Implement endpoints:
	- `GET /poll/paged`
	- `POST /poll`
	- `PUT /poll/update/:id`
	- `DELETE /poll/delete/:id`
- [ ] Support feed filters:
	- pagination
	- poll type
	- user
	- (future) location scope
- [ ] Return stable IDs for polls and options required by vote/results calls

### Phase 4 - Voting + Results

- [ ] Implement vote endpoint with poll-type-specific validation:
	- simple: single selection
	- multi: multi-select shape (if enabled)
	- slider: numeric range (0-100)
- [ ] Implement results endpoint:
	- `GET /poll/results/:id`
- [ ] Return normalized result shape usable by UI:
	- per-option vote counts
	- percentages
	- totals
	- slider average

### Phase 5 - Moderation + Safety Rules

- [ ] Persist score changes and moderation history
- [ ] Auto-delete poll when score reaches `-5`
- [ ] Add baseline anti-abuse controls:
	- rate limiting
	- duplicate vote protection
	- request validation + input sanitation

### Phase 6 - Ops + Reliability

- [ ] Add centralized logging and request tracing
- [ ] Add health/readiness endpoints
- [ ] Add CI pipeline checks:
	- lint
	- unit tests
	- migration verification
- [ ] Add backup/restore and incident playbook

### Frontend Integration Order

- [ ] Turn off mock auth mode in [src/services/loginService.ts](src/services/loginService.ts)
- [ ] Turn off mock polls mode in [src/screens/home.tsx](src/screens/home.tsx) and [src/screens/profile.tsx](src/screens/profile.tsx)
- [ ] Point [src/uri.ts](src/uri.ts) to environment-specific backend URLs
- [ ] Validate end-to-end flows:
	- login/logout/session restore
	- create poll
	- vote + submit
	- post-vote percentages
	- slider average updates

### Definition of Done (Backend MVP)

- [ ] No mock data paths required for auth/feed/voting
- [ ] Poll creation and voting persist correctly across app restarts/devices
- [ ] Results endpoint returns values needed for simple/multi percentage UI and slider average UI
- [ ] Moderation rule (`-5` delete) enforced server-side
