# Codex Prompt — Day 1: Setup & Go Fish Game Logic

> Copy the section below into a fresh Codex chat in VS Code. After Codex finishes, run the project, then report back with results.

---

## Task: Set up a Next.js project and implement Go Fish game logic as pure functions with tests

### Context
This is Day 1 of a 7-day project: a web app to play card games long-distance, starting with Go Fish. More card games will be added later. **Today is exclusively about setup + pure game logic with tests. NO UI, NO database, NO multiplayer** — those come on later days.

### Tech stack
- Next.js 14+ with App Router
- TypeScript (strict mode)
- Tailwind CSS (install only, do not use yet)
- Vitest for tests
- fast-check for property-based tests
- Package manager: npm

### Folder structure (create exactly this)
```
/
├── app/                       ← Next.js (leave default page for now)
├── lib/
│   ├── core/
│   │   ├── card.ts            ← Card type, deck creation, shuffle
│   │   └── types.ts           ← shared types (PlayerId, etc.)
│   └── games/
│       └── gofish/
│           ├── state.ts       ← GoFishState type + initialState()
│           ├── logic.ts       ← pure functions (askForCard, drawFromPool, ...)
│           ├── rules.ts       ← constants (HAND_SIZE, BOOK_SIZE)
│           ├── invariant.ts   ← assertInvariant()
│           └── index.ts       ← public API
├── tests/
│   ├── core/card.test.ts
│   └── games/gofish/
│       ├── logic.test.ts
│       ├── invariant.test.ts
│       └── property.test.ts   ← 1000 randomized games
└── ...
```

---

### Step 1 — Project setup
1. Initialize a new Next.js project with `npx create-next-app@latest` using these options: TypeScript yes, ESLint yes, Tailwind yes, src directory no, App Router yes, Turbopack yes, alias `@/*` yes.
2. Install dev dependencies: `vitest`, `@vitejs/plugin-react`, `fast-check`, `@types/node`.
3. Create `vitest.config.ts` with the React plugin and `tests/` as the test root.
4. Add npm scripts: `"test": "vitest"`, `"test:run": "vitest run"`.
5. Make sure `strict: true` is set in `tsconfig.json`.

---

### Step 2 — Core module (`lib/core/card.ts`)

```typescript
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export type Card = {
  id: string;       // e.g. "hearts-A" — globally unique within the 52-card deck
  rank: Rank;
  suit: Suit;
};
```

Implement:
- `RANKS: readonly Rank[]` and `SUITS: readonly Suit[]` as const arrays.
- `createDeck(): Card[]` — creates 52 cards with `id = ${suit}-${rank}`.
- `shuffle<T>(array: T[], rng?: () => number): T[]` — Fisher-Yates, with an injectable RNG for deterministic tests. Default is `Math.random`. **Immutable: returns a new array, does not mutate the input.**

---

### Step 3 — Go Fish state (`lib/games/gofish/state.ts`)

```typescript
import type { Card } from '@/lib/core/card';

export type PlayerId = 'A' | 'B';
export type Phase = 'asking' | 'gameOver';

export type GameEvent =
  | { type: 'ask'; from: PlayerId; to: PlayerId; rank: string; success: boolean; cardsGiven: number }
  | { type: 'goFish'; player: PlayerId; drewRank: string | null }
  | { type: 'bookFormed'; player: PlayerId; rank: string }
  | { type: 'gameOver'; winner: PlayerId | 'tie' };

export type GoFishState = {
  pool: Card[];                          // draw pile
  hands: Record<PlayerId, Card[]>;       // both hands
  books: Record<PlayerId, Card[][]>;     // collected books (each book = exactly 4 cards)
  currentPlayer: PlayerId;
  phase: Phase;
  history: GameEvent[];
  winner?: PlayerId | 'tie';
};
```

Function `createInitialState(rng?: () => number): GoFishState`:
- Build a 52-card deck, shuffle it.
- Deal 7 cards to A and 7 to B.
- Rest goes into `pool`.
- `currentPlayer: 'A'`, `phase: 'asking'`, empty books, empty history.
- **After initialization, immediately run `checkAndFormBooks` for both players** — if anyone already holds a book in the starting hand, lay it down right away.
- At the end, call `assertInvariant(state)`.

---

### Step 4 — Rules (`lib/games/gofish/rules.ts`)

```typescript
export const HAND_SIZE = 7;
export const BOOK_SIZE = 4;
export const DECK_SIZE = 52;
```

---

### Step 5 — Invariant (`lib/games/gofish/invariant.ts`)

`assertInvariant(state: GoFishState): void`

Checks:
1. Total card count (pool + both hands + all book cards flattened) must equal exactly `DECK_SIZE` (52).
2. All card IDs must be unique (Set size === 52).
3. Every book in `books` must contain exactly `BOOK_SIZE` (4) cards, all of the same rank.
4. If `phase === 'gameOver'`, `winner` must be set.

On violation: `throw new Error('Invariant violated: ...')` with a descriptive message.

---

### Step 6 — Logic (`lib/games/gofish/logic.ts`) — pure functions

**Important: All functions are PURE — they take state, return NEW state, mutate nothing. Use spread/map/filter, never push/splice on input structures.**

Helper function (internal):
- `moveCards(state, cardIds: string[], from: Zone, to: Zone): GoFishState` — the ONLY place where cards change zones. Throws if a card is not in `from`.
  - `Zone = { kind: 'pool' } | { kind: 'hand', player: PlayerId } | { kind: 'book', player: PlayerId, bookIndex: number }`
  - Book zones are a special case: new books are created via `addBook(state, player, cards)`, not via `moveCards`.

Public functions:

#### `askForCard(state, asker: PlayerId, target: PlayerId, rank: Rank): GoFishState`

Validations (throw with clear messages):
- `state.phase` must be `'asking'`.
- `asker` must equal `state.currentPlayer`.
- `asker !== target`.
- Asker must hold at least one card of `rank` in their hand (house rule).

Logic:
1. If target has cards of that rank: transfer all of them to the asker's hand.
   - Emit `ask` event with `success: true`, `cardsGiven: N`.
   - Check for books (see below).
   - **Turn ends anyway** (house rule): switch `currentPlayer`.
2. If target has no cards of that rank: "Go Fish".
   - Emit `ask` event with `success: false, cardsGiven: 0`.
   - Asker draws 1 card from the pool (if pool is not empty).
   - Emit `goFish` event with `drewRank: <drawn rank | null>`.
   - Check for books.
   - Turn ends, switch `currentPlayer`.
3. After everything: call `checkGameEnd(state)` → set phase to `gameOver` if applicable.

#### `checkAndFormBooks(state, player: PlayerId): GoFishState` (internal, exported for tests)
- Find all ranks where the player holds 4 cards.
- Remove them from the hand, add as a new book to `books[player]`.
- Emit a `bookFormed` event per book.
- **If the hand is empty after forming books but the pool still has cards: draw 1 card from the pool.** Then re-run the book check (a freshly drawn card could complete another book — recursion possible).

#### `checkGameEnd(state): GoFishState` (internal)
**House rule:** Game ends as soon as *any* player can no longer draw (empty hand + empty pool). Winner = more books. Tie → `winner = 'tie'`.

- If `pool.length === 0` AND (`hands.A.length === 0` OR `hands.B.length === 0`):
  - `phase = 'gameOver'`
  - `winner = books.A.length > books.B.length ? 'A' : books.B.length > books.A.length ? 'B' : 'tie'`
  - Append `gameOver` event.

#### `getLegalRanksToAsk(state, player: PlayerId): Rank[]`
- Returns all ranks the player currently holds (unique set).
- Will be used by the UI later.

---

### Step 7 — Public API (`lib/games/gofish/index.ts`)

Re-export: `createInitialState`, `askForCard`, `getLegalRanksToAsk`, and all types (`GoFishState`, `PlayerId`, `GameEvent`).

---

### Step 8 — Tests

#### `tests/core/card.test.ts`
- `createDeck()` produces 52 cards.
- All 52 card IDs are unique.
- All 13 ranks × 4 suits are present.
- `shuffle` with the same seeded RNG produces deterministic output.
- `shuffle` does not mutate the original array.

#### `tests/games/gofish/invariant.test.ts`
- Freshly created state passes the invariant.
- Manually corrupted state (duplicate card, missing card) → throws.

#### `tests/games/gofish/logic.test.ts`
Several concrete scenarios with a fixed seeded RNG (deterministic):
- Successful ask: cards transfer correctly, turn ends.
- "Go Fish": asker draws a card from the pool.
- Book formation: 4 matching ranks → book is laid down, hand size drops by 4.
- House rule check: asker asks for a rank they don't hold → throws.
- House rule check: asker asks themselves → throws.
- House rule check: wrong `currentPlayer` tries to ask → throws.
- Game end detection: artificial state with empty pool + empty hand A → `phase: 'gameOver'`, `winner` set correctly.

#### `tests/games/gofish/property.test.ts` (with fast-check)
**This is the bug killer:**

```typescript
import fc from 'fast-check';
// ...

test('1000 random games preserve the invariant', () => {
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 1_000_000 }), (seed) => {
      const rng = seededRng(seed);
      let state = createInitialState(rng);

      let safety = 500; // max moves, in case a bug causes an infinite loop
      while (state.phase === 'asking' && safety-- > 0) {
        // Pick: legal asker (= currentPlayer), random legal rank, target is the other player
        const legalRanks = getLegalRanksToAsk(state, state.currentPlayer);
        if (legalRanks.length === 0) break; // shouldn't happen if hand is non-empty

        const rank = legalRanks[Math.floor(rng() * legalRanks.length)];
        const target: PlayerId = state.currentPlayer === 'A' ? 'B' : 'A';

        state = askForCard(state, state.currentPlayer, target, rank);
        // assertInvariant is called at the end of askForCard
      }
    }),
    { numRuns: 1000 }
  );
});
```

Implement `seededRng(seed)` as a simple Mulberry32 or similar — what matters is that tests are deterministically reproducible.

**Additional property test:** After every move, the invariant must hold — either build `assertInvariant` into `askForCard` directly (defensive, also in production) or call it after every move in the test.

---

### Acceptance criteria
- [ ] `npm install` runs without errors.
- [ ] `npm run test:run` is green, all tests passing.
- [ ] 1000 random games in the property test pass without invariant violations.
- [ ] No `any` types in code (unless truly necessary, with a comment).
- [ ] No mutation of input state in any public function.
- [ ] `assertInvariant` is called at least at the end of `createInitialState` and `askForCard`.

---

### Non-goals for Day 1
- ❌ No UI / React components
- ❌ No database, no Supabase
- ❌ No multiplayer / WebSocket
- ❌ No API routes
- ❌ No authentication
- ❌ No animations or styling

---

### Wrap-up
- Create a short `README.md` in the project root with: one-line project purpose, Day 1 status, and `npm install` + `npm run test:run` as quickstart.
- Suggested commit: `Day 1: setup + Go Fish core logic with invariant tests`.

---

## What to do after Codex finishes

1. Run `npm install && npm run test:run`.
2. Come back and report:
   - Are all tests green?
   - If no: which tests fail and with what message?
   - If yes: share the folder structure and the contents of `lib/games/gofish/logic.ts` (the critical file) for review — to confirm house rules are implemented correctly and the invariant truly holds everywhere.
3. Only after this review proceed to Day 2 (UI).
