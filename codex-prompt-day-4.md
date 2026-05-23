# Codex Prompt — Day 4: Realtime Subscriptions

> Copy the section below into a fresh Codex chat in VS Code. After Codex finishes, run the manual test plan and report back before moving to Day 5 (deployment).

---

## Task: Replace 3-second polling with Supabase Realtime. Updates flow in milliseconds via WebSocket. Show a connection status banner so users see when the live link is down and reconnecting.

### Context
Day 3b is complete: the app is fully playable across two browsers, with Server Actions handling moves and state refreshing every 3 seconds via polling. Today we replace that polling with a Realtime subscription on the `games` table.

The architectural pattern we're using is **"ping, then fetch"**:
- Client subscribes to `UPDATE` events on the relevant `games` row.
- When any event arrives (asker moved, rematch requested, etc.), the client re-fetches the redacted view via the existing `getGameViewAction()`.
- The raw payload of the event is **deliberately ignored** — we never read game state from a client-readable source. This keeps server-authoritativeness intact.

A `<ConnectionStatus />` banner shows when the websocket is connecting, connected, or reconnecting after a drop.

### Architecture decisions (already made)
- **Realtime via Supabase JS client** (publishable key), not Server-Sent Events.
- **"Ping then fetch" pattern**: the Realtime event triggers a Server Action call, never used as the data source directly.
- **Polling removed entirely** — no belt-and-suspenders fallback for now.
- **`<ConnectionStatus />` as a standalone component** in `/components/`.
- **RLS policy** on `games` allows public read access (read-only); Realtime needs this to deliver events.

### Setup the user must do BEFORE testing

The user must run a migration in the Supabase SQL Editor:

```sql
-- 0003_realtime.sql
-- Run this in Supabase Dashboard → SQL Editor → New query

-- Add games table to the realtime publication
alter publication supabase_realtime add table public.games;

-- RLS policy: allow read access for Realtime delivery.
-- The state column is delivered to clients via Realtime, but our client
-- code deliberately ignores the payload and refetches via server action.
create policy "Anyone can read games"
  on public.games
  for select
  using (true);
```

Codex must create this file at `supabase/migrations/0003_realtime.sql` with a leading comment instructing the user to run it manually.

---

### Folder additions / modifications
```
/
├── lib/
│   └── supabase/
│       ├── client.ts                   ← unchanged (server admin)
│       └── browser.ts                  ← NEW: browser-side supabase client (publishable key)
├── components/
│   └── ConnectionStatus.tsx            ← NEW: connection banner
├── app/
│   └── game/[code]/
│       └── GameRoom.tsx                ← MODIFIED: polling removed, subscription added
└── supabase/
    └── migrations/
        └── 0003_realtime.sql           ← NEW: migration described above
```

---

### Step 1 — Browser-side Supabase client (`lib/supabase/browser.ts`)

Create a separate file (deliberately distinct from `lib/supabase/client.ts` which uses the service role key and must never reach the browser):

```typescript
'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
if (!supabaseAnonKey) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');

let cachedClient: SupabaseClient<Database> | null = null;

/**
 * Returns a singleton browser-side Supabase client.
 * Uses the publishable (anon) key — safe for client bundles.
 *
 * IMPORTANT: We use this client ONLY for Realtime subscriptions.
 * All data reads/writes go through Server Actions which use the
 * server-side admin client. Realtime payloads are treated as
 * "something changed" pings — we never read state from them.
 */
export function getBrowserSupabase(): SupabaseClient<Database> {
  if (!cachedClient) {
    cachedClient = createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 5,
        },
      },
    });
  }
  return cachedClient;
}
```

---

### Step 2 — Connection status component (`components/ConnectionStatus.tsx`)

Standalone component, reusable across screens:

```typescript
'use client';

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'error';

type Props = {
  state: ConnectionState;
};

export function ConnectionStatus({ state }: Props) {
  // Don't render anything when fully connected — avoid visual clutter
  if (state === 'connected') return null;

  const label =
    state === 'connecting'
      ? 'Connecting…'
      : state === 'reconnecting'
        ? 'Reconnecting…'
        : 'Connection lost';

  const bg =
    state === 'error'
      ? 'bg-red-600'
      : 'bg-amber-500';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-3 left-1/2 z-50 -translate-x-1/2 rounded-full ${bg} px-4 py-1.5 text-sm font-medium text-white shadow-lg`}
    >
      <span className="inline-block animate-pulse">●</span>
      <span className="ml-2">{label}</span>
    </div>
  );
}
```

The banner stays hidden when `state === 'connected'` so the UI is clean during normal play.

---

### Step 3 — Modify `app/game/[code]/GameRoom.tsx`

Remove the polling `useEffect` and replace it with a Realtime subscription. Add connection state tracking.

Key changes:

```typescript
'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import {
  askForCardAction,
  getGameViewAction,
  requestRematchAction,
  acceptRematchAction,
  declineRematchAction,
  type ClientGameView,
} from '@/lib/games/gofish/actions';
import { GameView } from '@/components/GameView';
import { Lobby } from '@/components/Lobby';
import { RematchPrompt } from '@/components/RematchPrompt';
import { ConnectionStatus, type ConnectionState } from '@/components/ConnectionStatus';
import { getBrowserSupabase } from '@/lib/supabase/browser';
import type { Rank } from '@/lib/core/card';

// Threshold before showing reconnecting banner — small drops shouldn't flash UI
const RECONNECT_BANNER_DELAY_MS = 2000;

type Props = {
  initialView: ClientGameView;
  code: string;
  gameId: string;  // NEW prop — see step 4
};

export function GameRoom({ initialView, code, gameId }: Props) {
  const [view, setView] = useState(initialView);
  const [selectedRank, setSelectedRank] = useState<Rank | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Connection state for the banner.
  // Starts as 'connecting'; flips to 'connected' once SUBSCRIBED comes through.
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');

  // Track whether we've ever been connected — used to differentiate
  // initial connection from a reconnection.
  const hasConnectedOnceRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refetch helper — called when realtime events arrive, AND on mount in case
  // we missed updates between the initial server render and the subscription
  // becoming active.
  const refetch = async () => {
    try {
      const fresh = await getGameViewAction(code);
      setView(fresh);
    } catch (err) {
      console.error('Refetch failed:', err);
    }
  };

  // Realtime subscription
  useEffect(() => {
    const supabase = getBrowserSupabase();

    const channel = supabase
      .channel(`game:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        () => {
          // PING, not data. Refetch the redacted view via server action.
          void refetch();
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
          }
          setConnectionState('connected');
          if (!hasConnectedOnceRef.current) {
            hasConnectedOnceRef.current = true;
            // First subscribe: do an initial refetch to catch anything that
            // may have happened between SSR and subscribe.
            void refetch();
          } else {
            // Reconnect: refetch in case events were missed during outage.
            void refetch();
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // Schedule the banner after a short delay so brief blips don't flash it
          if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = setTimeout(() => {
            setConnectionState(hasConnectedOnceRef.current ? 'reconnecting' : 'error');
          }, RECONNECT_BANNER_DELAY_MS);
        } else if (status === 'CLOSED') {
          // CLOSED can be normal during cleanup; only flag if we were connected
          if (hasConnectedOnceRef.current) {
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = setTimeout(() => {
              setConnectionState('reconnecting');
            }, RECONNECT_BANNER_DELAY_MS);
          }
        }
      });

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [gameId, code]);

  function handleAsk(rank: Rank) {
    setError(null);
    startTransition(async () => {
      try {
        const next = await askForCardAction({
          code,
          expectedVersion: view.version,
          rank,
        });
        setView(next);
        setSelectedRank(null);
      } catch (err) {
        setError((err as Error).message);
        // On version mismatch (or any error), refetch fresh state
        void refetch();
      }
    });
  }

  function handleRequestRematch() {
    setError(null);
    startTransition(async () => {
      try {
        const next = await requestRematchAction({
          code,
          expectedVersion: view.version,
        });
        setView(next);
      } catch (err) {
        setError((err as Error).message);
        void refetch();
      }
    });
  }

  function handleAcceptRematch() {
    setError(null);
    startTransition(async () => {
      try {
        const next = await acceptRematchAction({
          code,
          expectedVersion: view.version,
        });
        setView(next);
      } catch (err) {
        setError((err as Error).message);
        void refetch();
      }
    });
  }

  function handleDeclineRematch() {
    setError(null);
    startTransition(async () => {
      try {
        const next = await declineRematchAction({
          code,
          expectedVersion: view.version,
        });
        setView(next);
      } catch (err) {
        setError((err as Error).message);
        void refetch();
      }
    });
  }

  // -- render (unchanged from Day 3b except for adding <ConnectionStatus />) --

  if (view.status === 'waiting') {
    return (
      <>
        <ConnectionStatus state={connectionState} />
        <Lobby code={code} viewerName="You" />
      </>
    );
  }

  return (
    <>
      <ConnectionStatus state={connectionState} />
      <GameView
        state={view.state}
        viewerPlayer={view.viewerSlot ?? 'A'}
        opponentLabel={view.opponentName}
        isViewerTurn={view.state.currentPlayer === view.viewerSlot}
        opponentThinking={false}
        selectedRank={selectedRank}
        onSelectRank={setSelectedRank}
        onAskForCard={handleAsk}
        onNewGame={() => (window.location.href = '/')}
      />
      {/* Rematch prompts — unchanged from Day 3b */}
      {view.status === 'finished' && view.rematchRequestedBy === null && (
        <RematchPrompt
          mode="initiate"
          onRequest={handleRequestRematch}
          onLeave={() => (window.location.href = '/')}
          pending={pending}
        />
      )}
      {view.status === 'finished' &&
        view.rematchRequestedBy !== null &&
        view.rematchRequestedBy === view.viewerSlot && (
          <RematchPrompt
            mode="waiting"
            opponentName={view.opponentName}
            onLeave={() => (window.location.href = '/')}
          />
        )}
      {view.status === 'finished' &&
        view.rematchRequestedBy !== null &&
        view.rematchRequestedBy !== view.viewerSlot && (
          <RematchPrompt
            mode="incoming"
            opponentName={view.opponentName}
            onAccept={handleAcceptRematch}
            onDecline={handleDeclineRematch}
            pending={pending}
          />
        )}
      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-md bg-red-600 px-4 py-2 text-white shadow-lg">
          {error}
        </div>
      )}
    </>
  );
}
```

**Important removals:**
- The previous polling `useEffect` (the one with `setInterval(... POLL_INTERVAL_MS)`) must be **deleted entirely**.
- The `POLL_INTERVAL_MS` constant must be removed.

---

### Step 4 — Pass `gameId` to `GameRoom`

The Realtime subscription filters by `id=eq.${gameId}`, so the client needs the game id, not just the code. Update the server component that renders `GameRoom`:

In `app/game/[code]/page.tsx`, change:

```typescript
// before:
return <GameRoom initialView={initialView} code={code} />;

// after:
// The initial view comes from getGameViewAction which already loads the game by code,
// but doesn't return the id. We need to surface it.
return <GameRoom initialView={initialView} code={code} gameId={initialView.gameId} />;
```

To enable that, **extend `ClientGameView`** in `lib/games/gofish/actions.ts` to include `gameId`:

```typescript
export type ClientGameView = {
  gameId: string;        // NEW
  code: string;
  status: GameStatus;
  version: number;
  state: GoFishState;
  viewerSlot: PlayerId | null;
  opponentName: string;
  opponentPresent: boolean;
  rematchRequestedBy: PlayerId | null;
};
```

And populate `gameId: game.id` in `getGameViewAction`.

This is a small but mandatory change — without it the client can't subscribe to the right row.

---

### Step 5 — Update the Lobby polling

`components/Lobby.tsx` from Day 3b was just a visual component — polling was orchestrated by `GameRoom`'s parent effect, which is now the realtime subscription. The Lobby itself should be unchanged. Verify nothing else in the codebase relies on the removed polling interval.

---

### Step 6 — Defensive: clean up dead polling code

Search the codebase for `POLL_INTERVAL_MS` and `setInterval` — make sure no orphans remain in `app/game/[code]/GameRoom.tsx` or anywhere else. Codex must confirm in its summary that all polling code paths are gone.

---

### Step 7 — Tests

No new unit tests are strictly required for Day 4 — Realtime is hard to test without a live Supabase connection, and our existing integration tests already cover the repository functions that Realtime ultimately triggers.

However, add **one smoke test** to confirm `getBrowserSupabase()` doesn't crash on module load and uses the right env vars:

`tests/supabase/browser.test.ts`:
```typescript
import { describe, expect, test } from 'vitest';

const hasSupabaseConfig =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const describeIfSupabase = hasSupabaseConfig ? describe : describe.skip;

describeIfSupabase('browser supabase client', () => {
  test('returns a singleton client without throwing', async () => {
    const { getBrowserSupabase } = await import('@/lib/supabase/browser');
    const a = getBrowserSupabase();
    const b = getBrowserSupabase();
    expect(a).toBe(b);
  });
});
```

All previous tests must continue passing.

---

### Acceptance criteria
- [ ] `npm install` runs cleanly (no new deps needed — `@supabase/supabase-js` already in place from Day 3).
- [ ] `npm run test:run` is green: all Day 1–3 tests pass, new smoke test passes.
- [ ] `npm run dev` starts without errors.
- [ ] Migration file `supabase/migrations/0003_realtime.sql` is created with the leading "run me manually" comment.
- [ ] All polling code (`setInterval`, `POLL_INTERVAL_MS`) is gone — Codex must confirm via grep in its summary.
- [ ] `ClientGameView` includes `gameId` and it's populated in `getGameViewAction`.
- [ ] In a two-browser test, moves propagate within **< 1 second** typical, **< 3 seconds** worst case (vs. up to 3s with polling).
- [ ] Disconnecting WiFi briefly shows the "Reconnecting…" banner after ~2s; reconnecting hides it and refetches state.
- [ ] No console errors during normal play.
- [ ] Bot mode (`/game?bot=true`) still works without ever touching Realtime (Realtime code is only mounted in `GameRoom`, not in the bot page).

### Non-goals for Day 4
- ❌ No "presence" indicator showing whether opponent is currently online (separate Realtime feature, not needed for play).
- ❌ No typing indicators / "opponent is thinking" beyond what we already have.
- ❌ No fallback to polling when Realtime fails — keep it simple, fix later if needed.
- ❌ No optimistic UI updates beyond what we already do — the server is still the source of truth.
- ❌ No deployment to Vercel — that's Day 5.

### Wrap-up
- Update `README.md` with a Day 4 section:
  - Migration `0003_realtime.sql` must be run manually in Supabase.
  - In Supabase Dashboard, verify `games` table appears in Database → Replication with Realtime enabled.
  - How to test reconnection: turn WiFi off for ~3 seconds, observe banner, turn back on, observe banner disappear.
- Suggested commit: `Day 4: realtime subscriptions replace polling`.

---

## Manual test plan for the user (after Codex finishes)

1. Run migration `0003_realtime.sql` in Supabase SQL Editor.
2. In Supabase Dashboard, Database → Replication: confirm `games` is listed and enabled.
3. `npm run test:run` — all green.
4. `npm run dev`, open two browsers (e.g. Chrome + Chrome incognito).
5. Create a game in Browser 1, copy the link.
6. Open the link in Browser 2. **Notice**: Browser 1's lobby flips to game view almost instantly (vs. up to 3s with polling).
7. Play a few rounds. Confirm moves propagate sub-second.
8. **Reconnection test:** With game in progress, turn off WiFi on the laptop hosting Browser 1. Wait ~3s. The orange "Reconnecting…" banner should appear at the top.
9. Turn WiFi back on. Banner disappears within 1-2 seconds, state stays consistent.
10. Open Safari on phone (via LAN IP), join the same game. Verify Realtime works on mobile too.
11. Confirm `/game?bot=true` still works exactly as before (no Realtime, no banner — bot mode is purely local).
