# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # start dev server (localhost:3000)
npm run build        # production build
npm run lint         # eslint
npm run test         # vitest in watch mode
npm run test:run     # vitest one-shot (CI-style)
```

Run a single test file:
```bash
npx vitest run tests/games/gofish/logic.test.ts
```

Repository integration tests (`tests/games/gofish/repository.test.ts`, `tests/supabase/browser.test.ts`) are **skipped** unless `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in the environment. They run against a real Supabase project.

## Environment variables (`.env.local`)

| Variable | Used by |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | both server and browser clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser realtime client only |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only admin client; bypasses RLS |

## Architecture

### Two game modes

| Mode | Entry point | State management |
|---|---|---|
| Solo vs bot | `app/game/page.tsx` → `GameController` | Local React state; no network |
| Multiplayer | `app/game/[code]/page.tsx` → `GameRoom` | Server Actions + Supabase Realtime |

### `lib/games/gofish/` — strict layer order

```
rules.ts       constants (HAND_SIZE)
state.ts       GoFishState type, createInitialState
logic.ts       pure functions: askForCard, checkAndFormBooks, getLegalRanksToAsk
invariant.ts   assertInvariant (validates state after every mutation)
repository.ts  Supabase read/write; redactStateForViewer; optimistic locking
actions.ts     "use server" — Next.js Server Actions exposed to the client
index.ts       re-exports public surface of the layer
```

Upper layers may import from lower layers but not vice versa. `actions.ts` is the only file that touches cookies and Server Action semantics.

### Supabase — two separate clients

- `lib/supabase/client.ts` — **server-only**, service-role key, bypasses RLS. Import only from Server Actions or `repository.ts`.
- `lib/supabase/browser.ts` — **browser-only**, anon key, used **exclusively** for Realtime change pings. When an UPDATE arrives, `GameRoom` ignores the payload and calls `getGameViewAction` (a Server Action) to refetch the authoritative redacted view.

### Optimistic concurrency

Every write to `games` passes `expectedVersion` and includes `.eq("version", expectedVersion)` in the Supabase query. A concurrent write that increments the version first will cause `PGRST116` (no rows matched), which is mapped to `VersionMismatchError`. The client then refetches and the user retries.

### State redaction

`redactStateForViewer(state, viewer)` in `repository.ts` replaces the opponent's hand and the pool with dummy cards before the view is serialised and returned to the client. The full state is never sent to either player.

### Session identity

No auth. `lib/session/token.ts` issues a random UUID into an `icards_session` httpOnly cookie on first request. This token is the sole identity used to look up a `players` row.

### Database schema

Applied manually via SQL Editor migrations in `supabase/migrations/`. Three migrations in order:
1. `0001_initial.sql` — `games` + `players` tables
2. `0002_rematch.sql` — adds `rematch_requested_by` column
3. `0003_realtime.sql` — enables Realtime on the `games` table

## Testing notes

- Test framework: **vitest** (not Jest). Test root is `tests/`.
- Property-based tests use `fast-check` (`tests/games/gofish/property.test.ts`).
- Seeded RNG helper at `tests/helpers/seeded-rng.ts` for deterministic shuffle in tests.
