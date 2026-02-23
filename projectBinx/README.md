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

## Windows Android Notes

- Android builds use JDK 17.
- This project pins Gradle Java in [android/gradle.properties](android/gradle.properties) via `org.gradle.java.home`, so you should not need to set `JAVA_HOME` manually each run.
- If you recently changed system environment variables, fully restart VS Code/terminals once so new sessions pick them up.
- If Android Studio is open, ensure the SDK is installed and an emulator is created/started in Device Manager.

## Configure API Endpoints

Set your backend URL in:
- [src/uri.ts](src/uri.ts)

The app currently uses a placeholder domain and should be updated before real API testing.

## Scripts

- `npm start` - start Metro bundler
- `npm run android` - run Android app
- `npm run ios` - run iOS app
- `npm test` - run Jest tests
- `npm run lint` - run ESLint

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
