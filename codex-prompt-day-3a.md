# Codex Prompt — Day 3a: Supabase Persistence Layer

> Copy the section below into a fresh Codex chat in VS Code. After Codex finishes, run the integration test described at the end, then report back before moving to Day 3b.

---

## Task: Add a Supabase-backed persistence layer for Go Fish games

### Context
Day 2 is complete: a fully playable Go Fish UI against a random bot, with all state living in React state in the browser. We now add the persistence layer that will eventually support real multiplayer with my partner. Day 3 is split into two halves to keep scope manageable:

- **Day 3a (this prompt):** Pure persistence layer. No UI changes, no Server Actions, no networking from the browser. We add Supabase, a repository module, and game code generation, all testable in isolation.
- **Day 3b (next prompt, separate):** Server Actions, session cookies, lobby UI. Will wire the existing UI to the persistence layer.

The game stays playable against the bot throughout — Day 3a does not break Day 2.

### Architecture decisions (already made)
- **Server-authoritative:** Game logic will run server-side. The browser will never receive opponent cards. Day 3a sets up the storage; Day 3b adds the server endpoints.
- **State as JSONB:** The whole `GoFishState` lives in a single JSONB column per row. Atomic updates, no normalization headache.
- **Optimistic locking:** Every state mutation includes a version number to prevent race conditions.
- **Game codes:** Three-word codes from a word list, e.g. `BLUE-FOX-RIVER`.

### Tech stack additions
- `@supabase/supabase-js` — official Supabase client
- No other new dependencies needed

### Environment
The user has already set up a Supabase project and added these to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key>
SUPABASE_SERVICE_ROLE_KEY=<secret key>
```
**Do not regenerate or modify `.env.local`.**

### Folder additions
```
/
├── lib/
│   ├── supabase/
│   │   ├── client.ts         ← server-side Supabase client (uses service role key)
│   │   └── types.ts          ← TypeScript types for DB rows
│   ├── games/gofish/
│   │   └── repository.ts     ← persistence functions (createGame, loadGame, applyMove, ...)
│   └── codes/
│       ├── wordlist.ts       ← curated wordlist for game codes
│       └── generator.ts      ← generateGameCode()
├── supabase/
│   └── migrations/
│       └── 0001_initial.sql  ← SQL migration to create tables (user runs manually)
├── tests/
│   └── games/gofish/
│       └── repository.test.ts ← integration tests against real Supabase
└── ...
```

---

### Step 1 — Install Supabase client

```bash
npm install @supabase/supabase-js
```

---

### Step 2 — SQL migration (`supabase/migrations/0001_initial.sql`)

```sql
-- Games table: one row per game, full state as JSONB
create table public.games (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  state jsonb not null,
  version integer not null default 1,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index on code for fast lookup by invite link
create index games_code_idx on public.games (code);

-- Players table: tracks who occupies which slot in each game
create table public.players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  slot text not null check (slot in ('A', 'B')),
  session_token text not null,
  display_name text,
  joined_at timestamptz not null default now(),
  unique (game_id, slot),
  unique (game_id, session_token)
);

-- Index for fast lookup by session token
create index players_session_token_idx on public.players (session_token);

-- RLS: deny all by default. Server uses service role key, which bypasses RLS.
alter table public.games enable row level security;
alter table public.players enable row level security;

-- Auto-update updated_at on row update
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger games_set_updated_at
  before update on public.games
  for each row
  execute function public.set_updated_at();
```

**Important:** This file is for the user to run manually in the Supabase SQL Editor. Do not attempt to execute it from code. Add a clear comment at the top of the file:

```sql
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Paste the contents, click "Run". Verify both tables appear in Table Editor afterwards.
```

---

### Step 3 — Supabase client (`lib/supabase/client.ts`)

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
}
if (!supabaseServiceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
}

/**
 * Server-side Supabase client with full database access.
 * NEVER import this from client components — the service role key
 * must stay on the server.
 */
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
```

Add a JSDoc comment at the top of the file warning that this module is server-only.

---

### Step 4 — Database types (`lib/supabase/types.ts`)

Hand-rolled types (we're not generating from Supabase CLI yet — keep it simple):

```typescript
import type { GoFishState } from '@/lib/games/gofish';

export type GameStatus = 'waiting' | 'active' | 'finished' | 'abandoned';

export type GameRow = {
  id: string;
  code: string;
  state: GoFishState;
  version: number;
  status: GameStatus;
  created_at: string;
  updated_at: string;
};

export type PlayerRow = {
  id: string;
  game_id: string;
  slot: 'A' | 'B';
  session_token: string;
  display_name: string | null;
  joined_at: string;
};

export type Database = {
  public: {
    Tables: {
      games: {
        Row: GameRow;
        Insert: Omit<GameRow, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<GameRow>;
      };
      players: {
        Row: PlayerRow;
        Insert: Omit<PlayerRow, 'id' | 'joined_at'> & {
          id?: string;
          joined_at?: string;
        };
        Update: Partial<PlayerRow>;
      };
    };
  };
};
```

---

### Step 5 — Word list (`lib/codes/wordlist.ts`)

Curated list of short, unambiguous, friendly words. **All lowercase, no digits, no homophones.** Aim for ~150 words across 3 categories so 3-word combinations give >3 million possibilities (collision-free for our use case).

Three exported arrays — adjectives, animals, nouns. Approximately 50 each. Keep them G-rated, easy to spell, no ambiguous spellings (avoid "grey/gray", "lite", etc.):

```typescript
export const ADJECTIVES = [
  'blue', 'red', 'green', 'gold', 'silver', 'bright', 'calm', 'swift',
  'happy', 'lucky', 'brave', 'gentle', 'kind', 'merry', 'quiet', 'quick',
  'sunny', 'cozy', 'warm', 'cool', 'fresh', 'soft', 'tiny', 'mighty',
  'royal', 'noble', 'sleepy', 'eager', 'jolly', 'witty', 'shiny', 'misty',
  'sandy', 'sweet', 'lively', 'rosy', 'breezy', 'crisp', 'lush', 'mellow',
  'fuzzy', 'snug', 'bold', 'dapper', 'plucky', 'spry', 'zesty', 'cheery',
  'dreamy', 'curly',
];

export const ANIMALS = [
  'fox', 'bear', 'otter', 'owl', 'wolf', 'lion', 'tiger', 'eagle',
  'rabbit', 'mouse', 'deer', 'horse', 'duck', 'goose', 'frog', 'panda',
  'koala', 'lynx', 'hawk', 'crow', 'whale', 'shark', 'crab', 'seal',
  'cat', 'dog', 'bee', 'ant', 'snail', 'turtle', 'parrot', 'sparrow',
  'robin', 'badger', 'beaver', 'falcon', 'finch', 'gecko', 'heron', 'jay',
  'lemur', 'moose', 'newt', 'osprey', 'pigeon', 'quail', 'raven', 'salmon',
  'toad', 'wren',
];

export const NOUNS = [
  'river', 'mountain', 'forest', 'cloud', 'star', 'moon', 'meadow', 'island',
  'harbor', 'valley', 'canyon', 'desert', 'glacier', 'lake', 'pond', 'creek',
  'hill', 'cliff', 'beach', 'reef', 'cave', 'grove', 'pine', 'oak',
  'maple', 'birch', 'cedar', 'willow', 'fern', 'moss', 'rose', 'lily',
  'tulip', 'daisy', 'clover', 'sage', 'mint', 'thyme', 'amber', 'pearl',
  'opal', 'jade', 'quartz', 'ember', 'flame', 'spark', 'breeze', 'wave',
  'tide', 'mist',
];
```

(Adjust if any word feels off, but keep the ~50-each shape.)

---

### Step 6 — Code generator (`lib/codes/generator.ts`)

```typescript
import { ADJECTIVES, ANIMALS, NOUNS } from './wordlist';

/**
 * Generates a game code like "blue-fox-river".
 * Roughly 50^3 = 125,000 combinations per attempt.
 * Caller is responsible for checking uniqueness in the DB and retrying.
 */
export function generateGameCode(rng: () => number = Math.random): string {
  const pick = <T>(arr: readonly T[]) => arr[Math.floor(rng() * arr.length)]!;
  return `${pick(ADJECTIVES)}-${pick(ANIMALS)}-${pick(NOUNS)}`;
}
```

Pure function, deterministic with seeded RNG (so tests can be reproducible).

---

### Step 7 — Repository (`lib/games/gofish/repository.ts`)

The heart of Day 3a. **All functions are async, all return typed results, all errors are explicit.**

```typescript
import { supabaseAdmin } from '@/lib/supabase/client';
import type { GameRow, PlayerRow } from '@/lib/supabase/types';
import { generateGameCode } from '@/lib/codes/generator';
import {
  askForCard,
  createInitialState,
  type GoFishState,
  type PlayerId,
} from '@/lib/games/gofish';
import type { Rank } from '@/lib/core/card';

const MAX_CODE_RETRIES = 5;

export class GameNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Game not found: ${identifier}`);
    this.name = 'GameNotFoundError';
  }
}

export class VersionMismatchError extends Error {
  constructor() {
    super('Game state has been modified by another request');
    this.name = 'VersionMismatchError';
  }
}

export class SlotTakenError extends Error {
  constructor(slot: 'A' | 'B') {
    super(`Slot ${slot} is already taken`);
    this.name = 'SlotTakenError';
  }
}

/**
 * Creates a new game with a unique code. Initial state is dealt but
 * status is 'waiting' until both players have joined.
 * The creating player is auto-joined into slot A with the given session token.
 */
export async function createGame(params: {
  sessionToken: string;
  displayName?: string;
}): Promise<{ game: GameRow; player: PlayerRow }> {
  // 1. Generate a unique code (retry on collision)
  let code: string | null = null;
  for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
    const candidate = generateGameCode();
    const { data: existing } = await supabaseAdmin
      .from('games')
      .select('id')
      .eq('code', candidate)
      .maybeSingle();
    if (!existing) {
      code = candidate;
      break;
    }
  }
  if (!code) {
    throw new Error('Failed to generate unique game code after retries');
  }

  // 2. Create initial state
  const initialState = createInitialState();

  // 3. Insert game row
  const { data: gameInsert, error: gameErr } = await supabaseAdmin
    .from('games')
    .insert({
      code,
      state: initialState,
      version: 1,
      status: 'waiting',
    })
    .select('*')
    .single();
  if (gameErr || !gameInsert) {
    throw new Error(`Failed to create game: ${gameErr?.message ?? 'unknown'}`);
  }

  // 4. Insert player row (slot A)
  const { data: playerInsert, error: playerErr } = await supabaseAdmin
    .from('players')
    .insert({
      game_id: gameInsert.id,
      slot: 'A',
      session_token: params.sessionToken,
      display_name: params.displayName ?? null,
    })
    .select('*')
    .single();
  if (playerErr || !playerInsert) {
    // Clean up the orphaned game
    await supabaseAdmin.from('games').delete().eq('id', gameInsert.id);
    throw new Error(`Failed to create player: ${playerErr?.message ?? 'unknown'}`);
  }

  return { game: gameInsert, player: playerInsert };
}

/**
 * Loads a game by code. Throws GameNotFoundError if not found.
 */
export async function loadGameByCode(code: string): Promise<GameRow> {
  const { data, error } = await supabaseAdmin
    .from('games')
    .select('*')
    .eq('code', code)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to load game: ${error.message}`);
  }
  if (!data) {
    throw new GameNotFoundError(code);
  }
  return data;
}

/**
 * Loads a game by id. Throws GameNotFoundError if not found.
 */
export async function loadGameById(id: string): Promise<GameRow> {
  const { data, error } = await supabaseAdmin
    .from('games')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to load game: ${error.message}`);
  }
  if (!data) {
    throw new GameNotFoundError(id);
  }
  return data;
}

/**
 * Loads all players for a game.
 */
export async function loadPlayers(gameId: string): Promise<PlayerRow[]> {
  const { data, error } = await supabaseAdmin
    .from('players')
    .select('*')
    .eq('game_id', gameId)
    .order('joined_at', { ascending: true });
  if (error) {
    throw new Error(`Failed to load players: ${error.message}`);
  }
  return data ?? [];
}

/**
 * Loads a player by session token within a game.
 */
export async function loadPlayerByToken(
  gameId: string,
  sessionToken: string,
): Promise<PlayerRow | null> {
  const { data, error } = await supabaseAdmin
    .from('players')
    .select('*')
    .eq('game_id', gameId)
    .eq('session_token', sessionToken)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to load player: ${error.message}`);
  }
  return data;
}

/**
 * Joins a game as slot B. Throws if slot is taken or game is full/started.
 * Returns the player row and updated game row.
 */
export async function joinGame(params: {
  code: string;
  sessionToken: string;
  displayName?: string;
}): Promise<{ game: GameRow; player: PlayerRow }> {
  const game = await loadGameByCode(params.code);

  if (game.status !== 'waiting') {
    throw new Error(`Game is not accepting players (status: ${game.status})`);
  }

  // Check if this token already belongs to a player (idempotent rejoin)
  const existing = await loadPlayerByToken(game.id, params.sessionToken);
  if (existing) {
    return { game, player: existing };
  }

  // Otherwise insert as slot B
  const { data: playerInsert, error: playerErr } = await supabaseAdmin
    .from('players')
    .insert({
      game_id: game.id,
      slot: 'B',
      session_token: params.sessionToken,
      display_name: params.displayName ?? null,
    })
    .select('*')
    .single();
  if (playerErr || !playerInsert) {
    // 23505 is unique_violation; surface a friendlier error
    if (playerErr?.code === '23505') {
      throw new SlotTakenError('B');
    }
    throw new Error(`Failed to join game: ${playerErr?.message ?? 'unknown'}`);
  }

  // Mark game as active now that both players are in
  const { data: gameUpdate, error: gameErr } = await supabaseAdmin
    .from('games')
    .update({ status: 'active' })
    .eq('id', game.id)
    .select('*')
    .single();
  if (gameErr || !gameUpdate) {
    throw new Error(`Failed to activate game: ${gameErr?.message ?? 'unknown'}`);
  }

  return { game: gameUpdate, player: playerInsert };
}

/**
 * Applies an askForCard move with optimistic locking. Throws VersionMismatchError
 * if the game state has changed since the caller loaded it.
 *
 * The caller MUST pass the version they read from the DB. The repository
 * runs the pure game logic and writes back only if the version still matches.
 */
export async function applyAskMove(params: {
  gameId: string;
  expectedVersion: number;
  asker: PlayerId;
  target: PlayerId;
  rank: Rank;
}): Promise<GameRow> {
  // Read current state
  const game = await loadGameById(params.gameId);

  if (game.version !== params.expectedVersion) {
    throw new VersionMismatchError();
  }

  // Apply pure logic
  const nextState = askForCard(game.state, params.asker, params.target, params.rank);
  const nextStatus = nextState.phase === 'gameOver' ? 'finished' : game.status;

  // Conditional update: only succeed if version still matches
  const { data, error } = await supabaseAdmin
    .from('games')
    .update({
      state: nextState,
      version: game.version + 1,
      status: nextStatus,
    })
    .eq('id', params.gameId)
    .eq('version', params.expectedVersion)
    .select('*')
    .single();

  if (error || !data) {
    // If error code suggests no row matched, it's a race; throw VersionMismatch
    if (error?.code === 'PGRST116' || !data) {
      throw new VersionMismatchError();
    }
    throw new Error(`Failed to apply move: ${error.message}`);
  }

  return data;
}

/**
 * Returns a redacted view of the game state for a given viewer.
 * The opponent's hand cards have their suit/rank replaced with sentinel
 * values, while count is preserved.
 *
 * NOTE: This will be the ONLY way the client sees game state in Day 3b.
 * Day 3a just exports it; we don't use it yet.
 */
export function redactStateForViewer(
  state: GoFishState,
  viewer: PlayerId,
): GoFishState {
  const opponent: PlayerId = viewer === 'A' ? 'B' : 'A';
  const hiddenHand = state.hands[opponent].map((card, index) => ({
    id: `hidden-${opponent}-${index}`,
    rank: 'A' as const,  // placeholder, must not be used by UI
    suit: 'hearts' as const,
  }));
  return {
    ...state,
    hands: {
      ...state.hands,
      [opponent]: hiddenHand,
    },
    // Also redact the pool — players shouldn't see what's in the draw pile
    pool: state.pool.map((_, index) => ({
      id: `hidden-pool-${index}`,
      rank: 'A' as const,
      suit: 'hearts' as const,
    })),
  };
}
```

---

### Step 8 — Integration tests (`tests/games/gofish/repository.test.ts`)

These hit a **real Supabase project**, so they need the env vars to be set. Wrap them in a conditional skip so they don't fail in environments without DB access.

```typescript
import { afterEach, beforeAll, describe, expect, test } from 'vitest';
import { supabaseAdmin } from '@/lib/supabase/client';
import {
  createGame,
  joinGame,
  loadGameByCode,
  applyAskMove,
  redactStateForViewer,
  VersionMismatchError,
} from '@/lib/games/gofish/repository';

const hasSupabaseConfig =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY;

const describeIfSupabase = hasSupabaseConfig ? describe : describe.skip;

describeIfSupabase('repository (integration)', () => {
  const createdGameIds: string[] = [];

  afterEach(async () => {
    // Clean up all games created during this test run
    if (createdGameIds.length > 0) {
      await supabaseAdmin.from('games').delete().in('id', createdGameIds);
      createdGameIds.length = 0;
    }
  });

  test('createGame inserts a game and a player A', async () => {
    const { game, player } = await createGame({ sessionToken: 'test-token-A' });
    createdGameIds.push(game.id);

    expect(game.code).toMatch(/^[a-z]+-[a-z]+-[a-z]+$/);
    expect(game.version).toBe(1);
    expect(game.status).toBe('waiting');
    expect(player.slot).toBe('A');
    expect(player.session_token).toBe('test-token-A');
    expect(game.state.hands.A).toHaveLength(7);
    expect(game.state.hands.B).toHaveLength(7);
  });

  test('joinGame fills slot B and activates the game', async () => {
    const { game } = await createGame({ sessionToken: 'token-A' });
    createdGameIds.push(game.id);

    const { game: updatedGame, player } = await joinGame({
      code: game.code,
      sessionToken: 'token-B',
    });

    expect(player.slot).toBe('B');
    expect(updatedGame.status).toBe('active');
  });

  test('joinGame is idempotent for the same session token', async () => {
    const { game } = await createGame({ sessionToken: 'token-A' });
    createdGameIds.push(game.id);

    await joinGame({ code: game.code, sessionToken: 'token-B' });
    const second = await joinGame({ code: game.code, sessionToken: 'token-B' });

    expect(second.player.slot).toBe('B');
  });

  test('applyAskMove updates state and increments version', async () => {
    const { game } = await createGame({ sessionToken: 'token-A' });
    createdGameIds.push(game.id);
    await joinGame({ code: game.code, sessionToken: 'token-B' });

    const fresh = await loadGameByCode(game.code);
    const askerRanks = fresh.state.hands.A.map((c) => c.rank);
    const rankToAsk = askerRanks[0]!;

    const next = await applyAskMove({
      gameId: fresh.id,
      expectedVersion: fresh.version,
      asker: 'A',
      target: 'B',
      rank: rankToAsk,
    });

    expect(next.version).toBe(fresh.version + 1);
    expect(next.state.history.length).toBeGreaterThan(0);
  });

  test('applyAskMove rejects stale version (VersionMismatchError)', async () => {
    const { game } = await createGame({ sessionToken: 'token-A' });
    createdGameIds.push(game.id);
    await joinGame({ code: game.code, sessionToken: 'token-B' });

    const fresh = await loadGameByCode(game.code);
    const rankToAsk = fresh.state.hands.A[0]!.rank;

    // First move succeeds
    await applyAskMove({
      gameId: fresh.id,
      expectedVersion: fresh.version,
      asker: 'A',
      target: 'B',
      rank: rankToAsk,
    });

    // Second move with stale version must fail
    await expect(
      applyAskMove({
        gameId: fresh.id,
        expectedVersion: fresh.version,
        asker: 'B',
        target: 'A',
        rank: fresh.state.hands.B[0]!.rank,
      }),
    ).rejects.toBeInstanceOf(VersionMismatchError);
  });

  test('redactStateForViewer hides opponent hand and pool', async () => {
    const { game } = await createGame({ sessionToken: 'token-A' });
    createdGameIds.push(game.id);

    const redacted = redactStateForViewer(game.state, 'A');

    // A's hand is visible
    expect(redacted.hands.A).toEqual(game.state.hands.A);
    // B's hand has the right count but redacted content
    expect(redacted.hands.B).toHaveLength(game.state.hands.B.length);
    expect(redacted.hands.B[0]!.id).toMatch(/^hidden-/);
    // Pool is redacted
    expect(redacted.pool).toHaveLength(game.state.pool.length);
    expect(redacted.pool[0]!.id).toMatch(/^hidden-/);
  });
});
```

---

### Acceptance criteria
- [ ] `npm install` runs without errors.
- [ ] `npm run test:run` passes all Day 1 + Day 2 tests as before.
- [ ] If `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set, the new integration tests pass.
- [ ] If they are not set, the new tests are skipped (not failed).
- [ ] The SQL migration file exists at `supabase/migrations/0001_initial.sql` with the user-friendly comment at the top.
- [ ] The Day 2 UI still works exactly as before — no changes to `app/page.tsx`, `app/game/page.tsx`, or any `components/*.tsx`.
- [ ] No use of the publishable key anywhere on the server side (always service role key).
- [ ] No import of `lib/supabase/client.ts` from any client component (`'use client'` file).

### Non-goals for Day 3a
- ❌ No Server Actions, no API routes, no fetch from the browser
- ❌ No cookies, no session handling on the request layer
- ❌ No changes to existing components
- ❌ No realtime subscriptions
- ❌ No lobby UI

### Wrap-up
- Update `README.md`: add a "Day 3a — Persistence layer" section. Include the manual step: "Open Supabase dashboard → SQL Editor → paste `supabase/migrations/0001_initial.sql` → Run."
- Suggested commit: `Day 3a: Supabase persistence layer with optimistic locking`.
