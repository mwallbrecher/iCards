# Codex Prompt — Day 3b: Server Actions, Lobby, Rematch

> Copy the section below into a fresh Codex chat in VS Code. After Codex finishes, run through the manual test plan at the end, then report back.

---

## Task: Wire the existing UI to the Supabase persistence layer via Next.js Server Actions, add lobby flow with session cookies, and implement rematch with confirmation.

### Context
Day 3a is complete: repository functions for `createGame`, `joinGame`, `applyAskMove`, `redactStateForViewer` all live in `lib/games/gofish/repository.ts`, backed by Supabase tables `games` and `players`. UI from Day 2 still plays against a local bot via React state.

Today we connect the two: Server Actions call the repository, browser receives only the viewer's perspective of the state, polling keeps the screen fresh until Day 4 brings realtime.

### Architecture decisions (already made)
- **Server Actions, not Route Handlers** — all server interactions via Next.js Server Actions.
- **Session cookie**: httpOnly cookie holds a per-browser session token. The server uses it to map browser → player slot.
- **Polling, not realtime, today** — every 3 seconds while not your turn. Day 4 swaps this out for Supabase subscriptions.
- **Bot mode stays purely local** — accessible at `/game?bot=true`, no Supabase involvement. Same `GameView` component, different state source.
- **Rematch flow:** requires confirmation. Same game code reused. In-place state reset.

---

### Folder additions
```
/
├── app/
│   ├── page.tsx                    ← updated landing: New game / Join
│   └── game/
│       ├── page.tsx                ← keep for bot mode (existing)
│       └── [code]/
│           ├── page.tsx            ← server component: load game, redirect to actions
│           └── GameRoom.tsx        ← client component: orchestrates polling + actions
├── lib/
│   ├── session/
│   │   └── token.ts                ← cookie read/write helpers
│   └── games/gofish/
│       ├── actions.ts              ← Server Actions
│       └── repository.ts           ← extend with rematch helpers
├── components/
│   ├── Landing.tsx                 ← new landing page UI
│   ├── Lobby.tsx                   ← "waiting for opponent" screen
│   ├── RematchPrompt.tsx           ← rematch confirmation UI
│   └── GameView.tsx                ← extend props for rematch buttons
└── supabase/
    └── migrations/
        └── 0002_rematch.sql        ← add rematch_requested_by column
```

---

### Step 1 — Migration for rematch column (`supabase/migrations/0002_rematch.sql`)

```sql
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Adds rematch coordination column to games table.

alter table public.games
  add column rematch_requested_by text check (rematch_requested_by in ('A', 'B'));
```

User runs this manually before testing.

---

### Step 2 — Update DB types (`lib/supabase/types.ts`)

Add to `GameRow`:
```typescript
rematch_requested_by: 'A' | 'B' | null;
```

Verify the `Insert` and `Update` variants still work.

---

### Step 3 — Session cookie helpers (`lib/session/token.ts`)

```typescript
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

const COOKIE_NAME = 'icards_session';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Returns the existing session token from the cookie, or creates a new one.
 * Must be called from Server Actions or Server Components.
 */
export async function getOrCreateSessionToken(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(COOKIE_NAME)?.value;
  if (existing) return existing;

  const token = randomUUID();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ONE_YEAR_SECONDS,
    path: '/',
  });
  return token;
}

/**
 * Returns the session token if it exists, otherwise null. Does not create one.
 */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}
```

Note: Next.js 15 made `cookies()` async. If the user is on Next 14, drop the `await`. Codex should check the installed Next.js version (`package.json`) and use the right shape.

---

### Step 4 — Extend repository with rematch (`lib/games/gofish/repository.ts`)

Add to the existing file:

```typescript
export class RematchNotAllowedError extends Error {
  constructor(reason: string) {
    super(`Rematch not allowed: ${reason}`);
    this.name = 'RematchNotAllowedError';
  }
}

/**
 * Marks the game as having a rematch request from the given player.
 * Game must be in 'finished' status. Uses optimistic locking on version.
 */
export async function requestRematch(params: {
  gameId: string;
  expectedVersion: number;
  requester: PlayerId;
}): Promise<GameRow> {
  const game = await loadGameById(params.gameId);

  if (game.version !== params.expectedVersion) {
    throw new VersionMismatchError();
  }
  if (game.status !== 'finished') {
    throw new RematchNotAllowedError(`status is ${game.status}`);
  }

  const { data, error } = await supabaseAdmin
    .from('games')
    .update({
      rematch_requested_by: params.requester,
      version: game.version + 1,
    })
    .eq('id', params.gameId)
    .eq('version', params.expectedVersion)
    .select('*')
    .single();

  if (error) {
    if (isNoRowsError(error)) throw new VersionMismatchError();
    throw new Error(`Failed to request rematch: ${error.message}`);
  }
  if (!data) throw new VersionMismatchError();

  return data;
}

/**
 * Confirms a pending rematch: resets game state to a fresh deal, status to 'active'.
 * Only valid if there is a pending rematch request from the OTHER player.
 */
export async function acceptRematch(params: {
  gameId: string;
  expectedVersion: number;
  accepter: PlayerId;
}): Promise<GameRow> {
  const game = await loadGameById(params.gameId);

  if (game.version !== params.expectedVersion) {
    throw new VersionMismatchError();
  }
  if (game.status !== 'finished') {
    throw new RematchNotAllowedError(`status is ${game.status}`);
  }
  if (game.rematch_requested_by === null) {
    throw new RematchNotAllowedError('no pending rematch request');
  }
  if (game.rematch_requested_by === params.accepter) {
    throw new RematchNotAllowedError('cannot accept your own rematch request');
  }

  const newState = createInitialState();
  const { data, error } = await supabaseAdmin
    .from('games')
    .update({
      state: newState,
      status: 'active',
      rematch_requested_by: null,
      version: game.version + 1,
    })
    .eq('id', params.gameId)
    .eq('version', params.expectedVersion)
    .select('*')
    .single();

  if (error) {
    if (isNoRowsError(error)) throw new VersionMismatchError();
    throw new Error(`Failed to accept rematch: ${error.message}`);
  }
  if (!data) throw new VersionMismatchError();

  return data;
}

/**
 * Declines a pending rematch. Clears the request flag, game stays 'finished'.
 */
export async function declineRematch(params: {
  gameId: string;
  expectedVersion: number;
  decliner: PlayerId;
}): Promise<GameRow> {
  const game = await loadGameById(params.gameId);

  if (game.version !== params.expectedVersion) {
    throw new VersionMismatchError();
  }
  if (game.rematch_requested_by === null) {
    throw new RematchNotAllowedError('no pending rematch request');
  }
  if (game.rematch_requested_by === params.decliner) {
    throw new RematchNotAllowedError('cannot decline your own rematch request');
  }

  const { data, error } = await supabaseAdmin
    .from('games')
    .update({
      rematch_requested_by: null,
      version: game.version + 1,
    })
    .eq('id', params.gameId)
    .eq('version', params.expectedVersion)
    .select('*')
    .single();

  if (error) {
    if (isNoRowsError(error)) throw new VersionMismatchError();
    throw new Error(`Failed to decline rematch: ${error.message}`);
  }
  if (!data) throw new VersionMismatchError();

  return data;
}
```

Add tests for the three new functions in `tests/games/gofish/repository.test.ts`, following the existing patterns. At minimum:
- `requestRematch` only works when status is `finished`.
- `acceptRematch` produces a fresh deal with 7 cards each and status `active`.
- `declineRematch` clears the flag, status stays `finished`.
- `acceptRematch` rejects when the accepter is also the requester.

---

### Step 5 — Server Actions (`lib/games/gofish/actions.ts`)

This is the boundary between browser and DB. All exported functions use `'use server'`.

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Rank } from '@/lib/core/card';
import type { PlayerId } from '@/lib/games/gofish';
import {
  createGame,
  joinGame,
  loadGameByCode,
  loadPlayerByToken,
  applyAskMove,
  requestRematch,
  acceptRematch,
  declineRematch,
  redactStateForViewer,
  GameNotFoundError,
  VersionMismatchError,
  SlotTakenError,
  RematchNotAllowedError,
} from '@/lib/games/gofish/repository';
import { getOrCreateSessionToken } from '@/lib/session/token';
import type { GoFishState } from '@/lib/games/gofish';
import type { GameStatus } from '@/lib/supabase/types';

export type ClientGameView = {
  code: string;
  status: GameStatus;
  version: number;
  state: GoFishState;            // already redacted for the viewer
  viewerSlot: PlayerId | null;   // null = spectator (shouldn't happen in our flow)
  opponentName: string;
  opponentPresent: boolean;
  rematchRequestedBy: PlayerId | null;
};

/**
 * Creates a new game with the current session as player A.
 * Returns the code so the caller can redirect.
 */
export async function createGameAction(formData: FormData): Promise<{ code: string }> {
  const displayName = (formData.get('displayName') as string | null)?.trim() || null;
  const token = await getOrCreateSessionToken();
  const { game } = await createGame({
    sessionToken: token,
    displayName: displayName ?? undefined,
  });
  return { code: game.code };
}

/**
 * Joins an existing game by code as player B (or rejoins if token already in game).
 * Throws clear errors for "not found" / "full".
 */
export async function joinGameAction(formData: FormData): Promise<{ code: string }> {
  const code = (formData.get('code') as string | null)?.trim().toLowerCase();
  const displayName = (formData.get('displayName') as string | null)?.trim() || null;

  if (!code) throw new Error('Code is required');

  const token = await getOrCreateSessionToken();
  try {
    await joinGame({
      code,
      sessionToken: token,
      displayName: displayName ?? undefined,
    });
  } catch (err) {
    if (err instanceof GameNotFoundError) {
      throw new Error('No game found with that code');
    }
    if (err instanceof SlotTakenError) {
      throw new Error('That game is already full');
    }
    throw err;
  }
  return { code };
}

/**
 * Loads the game state for the current viewer, redacted appropriately.
 * Used by both initial server render and polling.
 */
export async function getGameViewAction(code: string): Promise<ClientGameView> {
  const token = await getOrCreateSessionToken();
  const game = await loadGameByCode(code);
  const player = await loadPlayerByToken(game.id, token);

  if (!player) {
    throw new Error('You are not a player in this game');
  }

  // Look up the opponent for name + presence
  const opponentSlot: PlayerId = player.slot === 'A' ? 'B' : 'A';
  const { data: opponentRow } = await (
    await import('@/lib/supabase/client')
  ).supabaseAdmin
    .from('players')
    .select('display_name')
    .eq('game_id', game.id)
    .eq('slot', opponentSlot)
    .maybeSingle();

  return {
    code: game.code,
    status: game.status,
    version: game.version,
    state: redactStateForViewer(game.state, player.slot),
    viewerSlot: player.slot,
    opponentName: opponentRow?.display_name ?? 'Opponent',
    opponentPresent: !!opponentRow,
    rematchRequestedBy: game.rematch_requested_by,
  };
}

/**
 * Makes an ask move. The caller must pass the version they have, for optimistic locking.
 */
export async function askForCardAction(params: {
  code: string;
  expectedVersion: number;
  rank: Rank;
}): Promise<ClientGameView> {
  const token = await getOrCreateSessionToken();
  const game = await loadGameByCode(params.code);
  const player = await loadPlayerByToken(game.id, token);
  if (!player) throw new Error('You are not a player in this game');

  const opponentSlot: PlayerId = player.slot === 'A' ? 'B' : 'A';

  try {
    await applyAskMove({
      gameId: game.id,
      expectedVersion: params.expectedVersion,
      asker: player.slot,
      target: opponentSlot,
      rank: params.rank,
    });
  } catch (err) {
    if (err instanceof VersionMismatchError) {
      // Surface as a recoverable error; client refreshes view
      throw new Error('Game state changed, please retry');
    }
    throw err;
  }

  return getGameViewAction(params.code);
}

export async function requestRematchAction(params: {
  code: string;
  expectedVersion: number;
}): Promise<ClientGameView> {
  const token = await getOrCreateSessionToken();
  const game = await loadGameByCode(params.code);
  const player = await loadPlayerByToken(game.id, token);
  if (!player) throw new Error('You are not a player in this game');

  try {
    await requestRematch({
      gameId: game.id,
      expectedVersion: params.expectedVersion,
      requester: player.slot,
    });
  } catch (err) {
    if (err instanceof VersionMismatchError) {
      throw new Error('Game state changed, please retry');
    }
    if (err instanceof RematchNotAllowedError) {
      throw new Error(err.message);
    }
    throw err;
  }
  return getGameViewAction(params.code);
}

export async function acceptRematchAction(params: {
  code: string;
  expectedVersion: number;
}): Promise<ClientGameView> {
  const token = await getOrCreateSessionToken();
  const game = await loadGameByCode(params.code);
  const player = await loadPlayerByToken(game.id, token);
  if (!player) throw new Error('You are not a player in this game');

  try {
    await acceptRematch({
      gameId: game.id,
      expectedVersion: params.expectedVersion,
      accepter: player.slot,
    });
  } catch (err) {
    if (err instanceof VersionMismatchError) {
      throw new Error('Game state changed, please retry');
    }
    if (err instanceof RematchNotAllowedError) {
      throw new Error(err.message);
    }
    throw err;
  }
  return getGameViewAction(params.code);
}

export async function declineRematchAction(params: {
  code: string;
  expectedVersion: number;
}): Promise<ClientGameView> {
  const token = await getOrCreateSessionToken();
  const game = await loadGameByCode(params.code);
  const player = await loadPlayerByToken(game.id, token);
  if (!player) throw new Error('You are not a player in this game');

  try {
    await declineRematch({
      gameId: game.id,
      expectedVersion: params.expectedVersion,
      decliner: player.slot,
    });
  } catch (err) {
    if (err instanceof VersionMismatchError) {
      throw new Error('Game state changed, please retry');
    }
    if (err instanceof RematchNotAllowedError) {
      throw new Error(err.message);
    }
    throw err;
  }
  return getGameViewAction(params.code);
}
```

---

### Step 6 — Landing page (`app/page.tsx` + `components/Landing.tsx`)

`app/page.tsx` becomes a thin server component that renders `<Landing />`. Landing is a client component:

```typescript
'use client';
// Two forms side by side or stacked:
// 1. "Start new game" form with displayName field, submits to createGameAction, redirects to /game/[code]
// 2. "Join with code" form with code field + displayName, submits to joinGameAction, redirects to /game/[code]
// 3. Below: small link "Play vs bot" → /game?bot=true
```

Use `useTransition` and `useState` for loading state. On error, show inline message (red text, not browser alert). On success, `router.push('/game/' + code)`.

Styling: continue with the emerald-themed Tailwind look, centered card on the background.

---

### Step 7 — Game page (`app/game/[code]/page.tsx`)

Server component, params shape per Next.js version:

```typescript
type Params = { code: string };

export default async function GameCodePage({
  params,
}: { params: Promise<Params> }) {
  const { code } = await params;
  const token = await getSessionToken();

  if (!token) {
    // No session → auto-join as player B
    redirect(`/game/${code}/join`);
  }

  // Load initial view server-side
  let initialView;
  try {
    initialView = await getGameViewAction(code);
  } catch (err) {
    if (err instanceof GameNotFoundError) notFound();
    // Token doesn't belong to this game → auto-join as B
    redirect(`/game/${code}/join`);
  }

  return <GameRoom initialView={initialView} code={code} />;
}
```

Add a helper route `app/game/[code]/join/page.tsx` that calls `joinGameAction` server-side and redirects back to `/game/[code]`. Or fold into the main page logic — Codex's choice, but keep it correct.

**Important:** If `loadPlayerByToken` returns null for the current code+token, the user is not yet a player. Auto-join them as B (handle `SlotTakenError` → show "Game full" via `notFound()` or a friendly page).

---

### Step 8 — GameRoom client component (`app/game/[code]/GameRoom.tsx`)

This is the new orchestrator. Replaces what `app/game/page.tsx` was doing for bot mode (which stays unchanged for `?bot=true`).

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
import type { Rank } from '@/lib/core/card';

const POLL_INTERVAL_MS = 3000;

type Props = {
  initialView: ClientGameView;
  code: string;
};

export function GameRoom({ initialView, code }: Props) {
  const [view, setView] = useState(initialView);
  const [selectedRank, setSelectedRank] = useState<Rank | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Polling: refresh when it's not the viewer's turn, or when waiting for opponent
  useEffect(() => {
    const isViewerTurn =
      view.viewerSlot !== null &&
      view.state.currentPlayer === view.viewerSlot &&
      view.status === 'active';

    // Always poll if waiting/finished or it's opponent's turn
    const shouldPoll = !isViewerTurn || view.status !== 'active';
    if (!shouldPoll) return;

    const id = setInterval(async () => {
      try {
        const fresh = await getGameViewAction(code);
        setView(fresh);
      } catch (err) {
        // Don't spam errors during polling; keep last good view
        console.error('Poll error:', err);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [view, code]);

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
        // On version mismatch, refresh state
        try {
          const fresh = await getGameViewAction(code);
          setView(fresh);
        } catch {}
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
      }
    });
  }

  // Render branching:
  if (view.status === 'waiting') {
    return <Lobby code={code} viewerName="You" />;
  }

  return (
    <>
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

---

### Step 9 — Lobby (`components/Lobby.tsx`)

Shown while `status === 'waiting'` (only player A is in).

Props:
```typescript
type LobbyProps = {
  code: string;
  viewerName: string;
};
```

UI:
- Headline "Waiting for opponent…"
- Big visible game code (`blue-fox-river`) — copyable
- "Copy invite link" button that copies `${window.location.origin}/game/${code}` to clipboard with feedback ("Copied!")
- A subtle animated spinner or pulse
- Tip text: "Share this link with your opponent to start."

Polling continues in the parent, so when opponent joins, status flips to `active` and the parent re-renders into the game.

---

### Step 10 — RematchPrompt (`components/RematchPrompt.tsx`)

Three modes:

```typescript
type RematchPromptProps =
  | { mode: 'initiate'; onRequest: () => void; onLeave: () => void; pending: boolean }
  | { mode: 'waiting'; opponentName: string; onLeave: () => void }
  | { mode: 'incoming'; opponentName: string; onAccept: () => void; onDecline: () => void; pending: boolean };
```

Render as a modal-style overlay or a banner under the GameOverBanner.

- `initiate`: "Want to play again?" + [Rematch] [Leave]
- `waiting`: "Waiting for {opponentName} to accept rematch…" + [Leave]
- `incoming`: "{opponentName} wants a rematch!" + [Accept] [Decline]

Disable buttons when `pending`.

---

### Step 11 — Update GameOverBanner

The existing `GameOverBanner` has a "Play again" button that resets local state. In online mode this doesn't apply — the `RematchPrompt` handles the flow.

Two options:
- Make the banner's "Play again" button optional via prop, hide it in online mode.
- Keep the banner purely informational (winner + book counts) and let `RematchPrompt` handle actions.

Pick the second: simplify `GameOverBanner` to just info, no "Play again" button. The action is in `RematchPrompt`.

For the local bot mode (`app/game/page.tsx`), keep the existing "Play again" behavior by rendering a separate inline button outside the banner. Bot mode does not get a rematch flow — just a "New game" button that calls `createInitialState()` like before.

---

### Step 12 — Keep bot mode working

The existing `app/game/page.tsx` (Day 2) handles `?bot=true` and runs fully local. Update `app/page.tsx`'s "Play vs bot" link to `/game?bot=true`.

`app/game/page.tsx` should redirect to `/` if `bot` is NOT set in search params — to avoid confusion with the new `/game/[code]` flow. Codex should handle this guard.

---

### Step 13 — Repository tests for rematch

Extend `tests/games/gofish/repository.test.ts` with at least:
- `requestRematch` succeeds when game is finished.
- `requestRematch` throws `RematchNotAllowedError` when game is active.
- `acceptRematch` produces a fresh deal: hands have 7 cards each, version reset behavior matches (new state, status active, request cleared).
- `acceptRematch` throws when same player tries to accept their own request.
- `declineRematch` clears the flag.

You'll need a helper that forces a game into `finished` state for testing — easiest is to use the repository's `update` directly with service role, or construct a finished state and update the row.

---

### Acceptance criteria
- [ ] `npm install` passes.
- [ ] `npm run test:run` is green: all Day 1-3a tests still pass, new rematch tests pass.
- [ ] `npm run dev` starts without errors.
- [ ] `/` shows landing page with both forms (New game / Join with code) and bot link.
- [ ] Creating a new game redirects to `/game/[code]` showing the Lobby.
- [ ] Opening the same `/game/[code]` URL in a second browser (or incognito window) auto-joins as player B, and player A's screen updates within ~3s.
- [ ] Both players see their own hand face-up, opponent's face-down with correct count.
- [ ] Asking for a card works, both screens reflect the new state within ~3s.
- [ ] Game ends correctly, GameOverBanner shows, RematchPrompt appears.
- [ ] Player A clicks Rematch → Player B sees "A wants rematch" → Player B clicks Accept → both see fresh deal.
- [ ] `/game?bot=true` still works exactly as Day 2.
- [ ] Day 3a integration tests for `redactStateForViewer` and `applyAskMove` still pass.
- [ ] Session cookie is `httpOnly`, persists across reloads, same browser stays as same player slot.

### Non-goals for Day 3b
- ❌ No realtime / Supabase subscriptions (that's Day 4).
- ❌ No leaderboards, stats, game history.
- ❌ No "kick player" or "abandon game" actions.
- ❌ No reconnect prompts ("you disconnected, want to rejoin?").
- ❌ No fancy animations on state transitions.
- ❌ No multi-language support.

### Wrap-up
- Update `README.md` with Day 3b section, including:
  - SQL migration `0002_rematch.sql` must be run manually in Supabase.
  - How to test: open two browsers (or normal + incognito), create game in one, paste code/link in other.
- Suggested commit: `Day 3b: server actions, lobby, polling, and rematch flow`.

---

## Manual test plan for the user (after Codex finishes)

1. Run migration `0002_rematch.sql` in Supabase SQL Editor. Verify `games` table has the new column.
2. `npm run test:run` — all green.
3. `npm run dev`, open two browsers (e.g. Chrome normal + Chrome incognito).
4. Browser 1: enter your name, click "New game" → land in Lobby with code visible.
5. Browser 2: click "Join with code", enter code from Browser 1 → both land in game.
6. Browser 1 (player A starts): click a card, "Ask for X" → Browser 2 updates within ~3s.
7. Play to completion. Verify GameOverBanner shows correctly in both browsers.
8. Browser 1: click "Rematch" → Browser 2 sees "A wants rematch" within ~3s.
9. Browser 2: click "Accept" → both browsers reload into a fresh deal within ~3s.
10. Test decline path on another playthrough.
11. Reload Browser 1 mid-game — should land back in the same game as the same player (session cookie working).
12. Open `/game?bot=true` — verify bot mode still works exactly as before.
