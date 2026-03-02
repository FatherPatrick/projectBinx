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
- Session restore on app launch via AsyncStorage-backed session service
- Bottom-tab app shell (`Home`, `CreatePoll`, `Profile`) with stack-based routes
- Home poll feed with dynamic poll rendering, sorting controls, and pull-to-refresh
- Comments screen route wired from poll actions
- Poll API service (`getPagedPolls`, `postPoll`, `voteById`, etc.)
- Poll type foundations: `simple`, `slider`, and `ama`
- AdMob initialized at app startup with ad rendering on Home

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

## AdMob Setup

AdMob is wired and initialized in app startup, with the Home feed currently rendering a card-styled **Banner** ad (`MEDIUM_RECTANGLE`) for Android testing.

Important compatibility note:

- The project uses `react-native-google-mobile-ads@13.4.0` (compatible with `react-native@0.73.x`).
- This package version supports banner/interstitial/rewarded flows; Native Advanced view components are not currently exposed in this version.

Before release, replace IDs with your real values:

- Android app ID in [android/app/src/main/AndroidManifest.xml](android/app/src/main/AndroidManifest.xml)
- iOS app ID in [ios/projectBinx/Info.plist](ios/projectBinx/Info.plist)
- Banner ad unit IDs in [src/config/admob.ts](src/config/admob.ts)

Required config for this package version:

- `app.json` includes `react-native-google-mobile-ads.android_app_id` in [app.json](app.json)

Notes:

- Keep test IDs in development (`__DEV__`) to avoid policy violations.
- AdMob app IDs (`~`) are different from ad unit IDs (`/`).

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
- `npm run dev:all` - delegate to root and run backend + Android together
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
