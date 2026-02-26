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
- Poll type foundations: `simple`, `slider`, and `ama`

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

Android emulator default is configured to `http://10.0.2.2:4000/api`.

## Test Login Credentials

Backend auth is wired and seeded in Postgres on first startup.

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

- Clean up code architecture. All logic is in screen/components files instead of best practices
- make test users return all polls instead of being location specific
- define some way to deploy this reliably on vercel
