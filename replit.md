# MIREC - Communauté de Foi

A React + TypeScript community app for MIREC (a church community in Cotonou).

## Architecture

- **Frontend:** React 18 + Vite + TypeScript
- **Styling:** Tailwind CSS + Shadcn UI (Radix UI primitives)
- **Backend/Auth/DB:** Supabase (authentication, PostgreSQL database, real-time, storage)
- **State:** TanStack Query (React Query) for server state
- **Routing:** React Router v6
- **Mobile:** Capacitor (Android/iOS packaging)

## Key Files

- `src/integrations/supabase/client.ts` — Supabase client (uses env vars)
- `src/integrations/supabase/types.ts` — Auto-generated DB types from Supabase
- `src/hooks/useAuth.tsx` — Auth context and provider
- `src/pages/` — Top-level page components (Auth, Feed, Groups, Messages, Louange, Profile, Marketplace)
- `src/components/mirec/` — Feature-specific UI components
- `src/components/ui/` — Shadcn/Radix UI base components
- `supabase/migrations/` — Database migration files

## Environment Variables

Set in Replit Secrets (shared environment):
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase public anon key

## Running the App

The app starts automatically via the "Start application" workflow:
```
npm run dev
```
Runs on port 5000.

## Features

- Authentication (login, register, password reset) via Supabase Auth
- Community feed (posts, testimonies, prayers, scriptures)
- Groups management
- Direct messaging
- Louange (worship) section
- Marketplace
- User profiles with spiritual levels and badges
- Points/gamification system
