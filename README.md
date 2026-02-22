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
- support for poll types: `simple`, `slider` (and `multi` in shared types)

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

## Roadmap

- enforce anonymous session/auth flow end-to-end
- implement score tracking + auto-delete at `-5`
- add geofenced/local feed support
- add abuse/rate-limit protections to prevent brigading/spam
- improve UX for creating different poll types

## Vision

Build a lightweight, anonymous polling network where local communities decide what deserves to stay visible.
