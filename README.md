# When2Meet · Global

A timezone-aware group scheduling app — think When2Meet, but everyone sees the grid in their own local time instead of the organizer's.

**Live demo: [when2meetglobal.vercel.app](https://when2meetglobal.vercel.app/)**

## What it does

- **Create an event** by picking candidate dates and a time-of-day range in your own timezone — no account required.
- **Mark availability** on a drag-to-paint grid with three states (free / maybe / busy), or tap a date header to toggle the whole day at once.
- **Share a link.** Each participant opens the same link, picks their own timezone, and the grid re-renders in their local hours (times are stored as UTC internally).
- **See the group heatmap** of everyone's combined availability, plus a ranked list of the best time slots — scored by how many people are free/maybe, with a small bonus for slots that fall in everyone's local business hours.
- **Organizer can confirm a slot**, which pins a "Confirmed" banner at the top of the event page for all participants.
- Light/dark theme toggle, and event data persists via a shareable slug URL (`/e/[slug]`) so no login is needed to return to an event.

## Tech stack

- **[Next.js 14](https://nextjs.org)** (App Router) + **React 18** + **TypeScript**
- **[Tailwind CSS](https://tailwindcss.com)** for styling
- **[Zustand](https://github.com/pmndrs/zustand)** for client state
- **[date-fns](https://date-fns.org)** / **date-fns-tz** for timezone-aware date math
- **[Vercel KV](https://vercel.com/docs/storage/vercel-kv)** for event/response storage in production, with a local JSON-file fallback (`.data/`) so the app runs with zero setup in development
- **nanoid** for short, shareable event slugs

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). In local dev, event data is written to `.data/*.json` automatically — no database setup required.

To use Vercel KV instead (e.g. for a production deploy), set `KV_REST_API_URL` and `KV_REST_API_TOKEN` in your environment; `lib/kv.ts` switches storage backends automatically when those are present.

## Project structure

```
app/
  page.tsx                 # Create-event flow (setup → mark availability)
  e/[slug]/page.tsx         # Event page: submit availability, view heatmap & best times
  api/events/               # REST endpoints for creating events and submitting responses
components/                 # Calendar picker, availability grid, heatmap, timezone select, etc.
lib/
  timezone.ts              # UTC slot generation, local-time conversion/formatting
  scoring.ts                # Tallies responses into per-slot scores and ranks best times
  kv.ts                     # Storage layer (Vercel KV in prod, JSON files in dev)
```

## Deploy

Deployed on [Vercel](https://vercel.com). Push to `main` and connect the repo, or run:

```bash
vercel deploy
```
