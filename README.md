Long-distance card game app, starting with Go Fish.

## Status

Day 1: Set up the Next.js project and implemented pure Go Fish game logic with invariant and property-based tests.

Day 2: Added a playable browser UI with a random-move bot opponent. No networking, database, authentication, persistence, or multiplayer sync has been added.

Day 3a: Added the Supabase persistence layer, game-code generation, repository functions, optimistic locking, and integration tests that run only when Supabase env vars are configured.

Day 3b: Added server actions, session-cookie based player identity, online lobby flow, polling game rooms, and rematch coordination.

Day 4: Replaced online-room polling with Supabase Realtime subscriptions and added a connection-status banner for reconnecting clients.

## Day 3a - Persistence Layer

Before using the repository against Supabase, open the Supabase dashboard, go to SQL Editor, paste `supabase/migrations/0001_initial.sql`, and run it. Verify the `games` and `players` tables appear in Table Editor afterwards.

Repository integration tests run when `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present in the test process environment; otherwise they are skipped.

## Day 3b - Online Rooms And Rematch

Before testing rematches, open the Supabase dashboard, go to SQL Editor, paste `supabase/migrations/0002_rematch.sql`, and run it. Verify the `games` table has the `rematch_requested_by` column afterwards.

To test online play, run `npm run dev`, create a game in one browser, then open the invite link or enter the game code in a second browser or incognito window. Bot mode remains available at `/game?bot=true`.

## Day 4 - Realtime Subscriptions

Before testing Realtime, open the Supabase dashboard, go to SQL Editor, paste `supabase/migrations/0003_realtime.sql`, and run it manually. Then verify the `games` table appears in Database -> Replication with Realtime enabled.

Online rooms now subscribe to `games` row updates and refetch the redacted game view through server actions when a change arrives. To test reconnect behavior, start an online game, turn WiFi off for about 3 seconds, verify the reconnecting banner appears, then turn WiFi back on and verify the banner disappears after the state refreshes.

## Quickstart

```bash
npm install
npm run test:run
```

To play locally:

```bash
npm run dev
```

Visit `/game?bot=true` for a new game against the bot.
