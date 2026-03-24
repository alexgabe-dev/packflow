# PackFlow

<div align="center">
  <h3>A modern Pokemon TCG collection manager for stash planning, session logging, binder progress, and profile-driven collecting.</h3>
  <p>
    Track sealed packs, log openings, manage collections by set, build a profile, unlock badges, and keep everything synced to SQLite.
  </p>
</div>

---

## Overview

PackFlow is a full-stack collector app built for people who want more than a checklist.

It combines:

- stash and session planning
- collection tracking by set
- wishlist and favorite-card systems
- history and progression analytics
- profile customization and showcase features
- SQLite-backed account persistence

The app is designed to feel more like a collector dashboard than a spreadsheet.

## Highlights

- `Collection Manager`
  Browse sets, search cards, filter by owned / missing / favorites / wanted, and run bulk actions.

- `Session Logging`
  Track openings, log pulls, and push progress directly into your collection and history.

- `History + Progression`
  View session analytics, streaks, milestones, achievements, and collector archetypes.

- `Profile System`
  Customize your profile, upload a portrait and backdrop, feature favorite cards, and show off your badge cabinet.

- `Comment Wall`
  Steam-style profile wall with account-based comments, edit/remove actions, and persistent storage.

- `SQLite Account Backend`
  Register, log in, and keep your collection, stash, sessions, profile, and settings saved locally.

## Tech Stack

- `Frontend:` React 19, TypeScript, Vite, Motion, Lucide, Sonner
- `Backend:` Express, better-sqlite3
- `Storage:` SQLite
- `Styling:` utility-first CSS with custom visual treatment across the app
- `Data:` TCGdex for card / set data

## Screens

- `Dashboard` for summary and next-session planning
- `Calendar` for session scheduling
- `Collection` for binder-style card management
- `History` for analytics and session timeline
- `Profile` for showcase, comments, badges, and featured cards
- `Management` for stash, budget, presets, and opening operations
- `Settings` for account, password, email, reset, and delete-account controls

## Getting Started

### Prerequisites

- `Node.js 18+`
- `npm`

### Install

```bash
npm install
```

### Run in development

```bash
npm run dev
```

This starts:

- the Vite client on `http://127.0.0.1:3000`
- the Express + SQLite backend on `http://127.0.0.1:3001`

### Production build

```bash
npm run build
npm run start
```

## Scripts

```bash
npm run dev         # start client + server together
npm run dev:client  # start Vite only
npm run dev:server  # start Express server only
npm run build       # production frontend build
npm run start       # start server in production mode
npm run preview     # production-style server run
npm run lint        # TypeScript type-check
npm run clean       # remove dist
```

## Data Storage

PackFlow stores account data in SQLite at:

```txt
data/packflow.sqlite
```

This includes:

- auth users
- login sessions
- app state per account

## Project Structure

```txt
src/
  components/   UI screens and interactive views
  context/      app state and auth state
  lib/          progression, scheduler, utilities
  services/     TCGdex API integration
server/
  index.mjs     Express + SQLite backend
public/
  assets/       static images and profile/card assets
data/
  packflow.sqlite
```

## Current Product Direction

PackFlow is built around a few core ideas:

- collection tracking should feel visual, not clerical
- profile and progression should reward long-term collecting
- planning, stash management, and history should all connect
- account settings and management tools should feel like distinct surfaces

## Notes

- The repository still contains a few leftovers from its earlier template origins.
- The production build currently emits a large bundle warning, but the app builds and runs successfully.
- The included `.env.example` reflects older template values and is not the main source of truth for current local development.

## Verification

At the time of this README refresh, the project passes:

```bash
npm run lint
npm run build
```

---

<div align="center">
  <sub>PackFlow is built to make collecting feel intentional, trackable, and fun.</sub>
</div>
