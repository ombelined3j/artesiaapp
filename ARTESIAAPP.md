# Artesia

A mobile-first web app for discovering and booking art exhibitions in Paris — "Découvrez et réservez les meilleurs expos." Built with [Lovable](https://lovable.dev) and connected to Lovable Cloud (Supabase) for auth, data, and syncing.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) (SSR, file-based routing) on Vite 8 |
| UI | React 19, Tailwind CSS v4, shadcn/ui (Radix primitives) |
| Routing | TanStack Router (file-based, under `src/routes`) |
| Data fetching | TanStack Query |
| Backend | Supabase (Postgres + Auth + RLS), via Lovable Cloud |
| Forms | react-hook-form + zod |
| Charts/misc UI | recharts, embla-carousel, vaul, sonner (toasts) |
| Language | TypeScript |
| Package manager | npm (also has a `bun.lock`/`bunfig.toml` — either works; this environment uses npm) |
| Build target | Cloudflare (`nitro` preset `cloudflare-module`) |

## Project structure

```
src/
  routes/                    File-based routes (TanStack Router)
    index.tsx                 Public landing page
    login.tsx, signup.tsx     Auth pages
    _authenticated/           Route group requiring a logged-in user
      route.tsx                 Guard: redirects to /login if not authenticated
      upcoming.tsx               Main discovery feed (today/tomorrow, filters)
      for-you.tsx                Personalized recommendations
      tickets.tsx                User's reservations (upcoming/past)
      profile.tsx                Account page + manual data-sync trigger
      exhibition.$exhibitionId.tsx        Exhibition detail page
      exhibition.$exhibitionId.book.tsx   Booking flow
      reservation.$reservationId.tsx      Booking confirmation
    __root.tsx                Root shell: HTML doc, fonts, error/404 boundaries, auth-state listener
  components/
    artesia/                  App-specific components (AppShell, BottomNav, ExhibitionCard, Logo, MuseumMap)
    ui/                       shadcn/ui primitives (button, dialog, drawer, select, calendar, etc.)
  lib/
    artesia.ts                 Core domain logic: types, Supabase queries, price/date formatting,
                                recommendation scoring
    paris-sync.functions.ts    Server function that syncs exhibitions from Paris Open Data
    museum-images.ts           Local fallback images per museum
    utils.ts                   cn() class helper
  integrations/supabase/
    client.ts                  Browser Supabase client (proxied, lazy-init)
    client.server.ts           Server-side Supabase client
    auth-middleware.ts         Server-fn auth guard (used by sync function)
    auth-attacher.ts, previewAuthStorage.ts, cron-auth.ts, types.ts (generated DB types)
  assets/                     Images; large binaries are stored via Lovable Cloud asset
                               pointers (`*.asset.json`) rather than committed as files
                               (see "Assets" below)
  router.tsx, server.ts, start.ts   TanStack Start entry points
  styles.css                  Tailwind entry
supabase/
  schema.sql                  Full schema dump (tables, RLS policies, triggers, seed data)
  migrations/                 Incremental SQL migrations
  config.toml                 Supabase project config
.lovable/plan/                 Dated feature-plan notes written by Lovable during development
                               (design decisions/history, in French)
```

## Data model (Supabase / Postgres)

Defined in [supabase/schema.sql](supabase/schema.sql), all tables have RLS enabled.

- **`profiles`** — one row per auth user (`id` = `auth.users.id`), auto-created via a trigger on signup.
- **`museums`** — Paris museums/venues (name, address, district, lat/lng, website, image). Public read.
- **`exhibitions`** — the core content: title, description, image, date range, opening hours, price, `is_free`, `booking_url`, `exhibition_type`, `mood`, `popularity`. Public read. Also has sync-related columns referenced in code (`source`, `source_id`, `price_detail`, `last_synced_at`) added by later migrations.
- **`favorites`** — user ↔ exhibition, owned by the user (RLS: `auth.uid() = user_id`).
- **`reservations`** — bookings: date, time slot, visitor count, ticket type, total price, status, auto-generated `booking_reference`. Owned by the user.
- **`exhibition_views`** — lightweight signal table (what a user looked at) used to power recommendations.

Row-level security throughout: users can only read/write their own `favorites`, `reservations`, and `exhibition_views`; `museums` and `exhibitions` are publicly readable; `profiles` are self-only.

## Key features

- **Discovery feed** (`upcoming.tsx`) — browse exhibitions open today/soon, with filters (type, mood, museum, free/paid).
- **Recommendations** (`for-you.tsx`) — client-side scoring in `scoreExhibition()`/`recommend()` (`src/lib/artesia.ts`) blends popularity, whether the exhibition is currently open, the user's preferred types/moods (derived from past views & reservations), and penalizes already-viewed/booked items.
- **Booking flow** — pick a date/time slot and ticket type, creates a `reservations` row, then shows a confirmation page with the booking reference.
- **Exhibition detail** — description, dates, price, museum info with an embedded map (`MuseumMap.tsx`, Google Maps Embed API).
- **Data sync from Paris Open Data** — `syncParisExhibitions` (`src/lib/paris-sync.functions.ts`) is a TanStack Start **server function** that pulls from the city of Paris's public dataset (`que-faire-a-paris-`), filters by a curated list of art-related tags, cleans HTML, and upserts into `exhibitions`. Triggered manually from the Profile page (admin/auth-gated via `auth-middleware.ts`).
- **Auth** — Supabase email/password auth; `_authenticated/route.tsx` guards the whole authenticated route group and redirects to `/login`.

## Environment variables

Defined in `.env` (not committed as secrets — these are publishable/browser-safe keys):

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` / `VITE_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |
| `SUPABASE_PROJECT_ID` / `VITE_SUPABASE_PROJECT_ID` | Supabase project ref |
| `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` | Google Maps Embed API key (museum map) |
| `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID` | Maps usage tracking ID |

## Assets: a Lovable Cloud quirk

Large images uploaded through the Lovable editor are **not stored in git**. Instead, `src/assets/*.asset.json` pointer files reference the real file in Lovable's cloud storage (R2), and the Vite plugin `@lovable.dev/vite-tanstack-config` proxies `/__l5e/assets-v1/...` requests to fetch them — but **only if `LOVABLE_PREVIEW_HOST` is set**. In a plain local clone (like this one) that env var isn't set, so those images 404.

Fix used for the homepage hero image: downloaded the real file, saved it as `src/assets/hero-artesia.webp`, and changed `src/routes/index.tsx` to `import heroImage from "@/assets/hero-artesia.webp"` (a normal Vite asset import) instead of importing the `.asset.json` pointer. The same fix would be needed for any other `*.asset.json`-only image (e.g. `src/assets/museums/*.jpg.asset.json`) if it needs to render outside of Lovable's own preview.

## Running locally

```bash
npm install
npm run dev      # vite dev — serves on http://localhost:8080
```

Other scripts: `npm run build`, `npm run build:dev`, `npm run preview`, `npm run lint`, `npm run format`.

Requires Node.js (this machine uses Node v24.21.0 via nvm) and the env vars above in `.env`.

## Notes

- This repo is connected to Lovable: pushes to the tracked branch sync back into the Lovable editor. Avoid force-push/rebase/amend on already-pushed commits (see `AGENTS.md`).
- `.lovable/plan/*.md` contains dated design notes (in French) explaining past feature decisions — useful history when a UI choice seems non-obvious.
- Route params use TanStack Router's file-based convention: `exhibition.$exhibitionId.tsx` → `/exhibition/:exhibitionId`.
