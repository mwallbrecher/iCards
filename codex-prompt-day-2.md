# Codex Prompt — Day 2: UI with Bot Opponent

> Copy the section below into a fresh Codex chat in VS Code. After Codex finishes, run `npm run dev`, play a few rounds, then report back.

---

## Task: Build a playable Go Fish UI with a random-move bot opponent

### Context
Day 1 is complete: pure game logic in `lib/games/gofish/` with passing tests including a property-based test over 1000 random games. Today we build the UI layer so the game can actually be played in the browser. The opponent is a simple bot that picks random legal moves — no networking, no second tab, no database yet.

**Important architectural note:** The UI is designed to be **multiplayer-ready from the start**. It will be reused later when we add Supabase realtime sync (Day 4). To make that refactor painless, the main game view takes a `viewerPlayer` prop and renders the state from that player's perspective only. Today we just happen to render `viewerPlayer="A"` and have the bot play as B.

### Tech stack additions
- React Server Components / Client Components from Next.js App Router
- Tailwind CSS for styling (already installed Day 1)
- No new dependencies needed

### Folder additions
```
/
├── app/
│   ├── page.tsx              ← landing page → "New game" button
│   └── game/
│       └── page.tsx          ← game screen
├── components/
│   ├── GameView.tsx          ← main perspective-aware view
│   ├── Hand.tsx              ← own hand (face-up, clickable)
│   ├── OpponentHand.tsx      ← opponent's hand (face-down, count only)
│   ├── Card.tsx              ← single card (Tailwind, text-based)
│   ├── CardBack.tsx          ← face-down card
│   ├── Pool.tsx              ← draw pile with remaining count
│   ├── Books.tsx             ← completed books for one player
│   ├── EventLog.tsx          ← scrolling history of moves
│   └── GameOverBanner.tsx    ← win/loss/tie screen
├── lib/
│   └── bot/
│       └── randomBot.ts      ← bot logic
└── ...
```

---

### Step 1 — Card component (`components/Card.tsx`)

Text-based, Tailwind-styled. Props:
```typescript
type CardProps = {
  card: Card;                 // imported from @/lib/core/card
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';  // default 'md'
};
```

Visual requirements:
- Rectangle, rounded corners, white background, subtle border
- Rank in top-left (large), suit symbol in center (very large)
- Hearts/Diamonds: red text (`text-red-600`)
- Clubs/Spades: black text (`text-gray-900`)
- Suit symbols: `♥ ♦ ♣ ♠` (Unicode)
- `selected` adds a ring (`ring-2 ring-blue-500`) and slight upward translation
- `onClick` adds `cursor-pointer` and hover effect (`hover:-translate-y-1 transition`)
- Sizes (sm/md/lg) just scale width/height/font-size — be consistent

### Step 2 — CardBack (`components/CardBack.tsx`)

Simple face-down card: same dimensions as `Card`, but background pattern (e.g. `bg-blue-700` with a diagonal stripe pattern via `bg-[repeating-linear-gradient(...)]` or similar). No content visible.

### Step 3 — Hand (`components/Hand.tsx`)

Renders the viewer's own hand, face-up, clickable.

Props:
```typescript
type HandProps = {
  cards: Card[];
  selectedRank: Rank | null;
  onSelectRank: (rank: Rank | null) => void;
  disabled?: boolean;  // true when it's not this player's turn
};
```

Behavior:
- Cards laid out horizontally, slightly overlapping if hand > 8 cards
- Sorted by rank (then suit) for readability
- Clicking a card sets `selectedRank` to that card's rank
- All cards of the selected rank are highlighted (since the player asks by rank, not by specific card)
- Clicking a card of the already-selected rank deselects
- When `disabled`, cards are dimmed (`opacity-50`) and not clickable

### Step 4 — OpponentHand (`components/OpponentHand.tsx`)

Renders the opponent's hand as face-down cards.

Props:
```typescript
type OpponentHandProps = {
  count: number;
  thinking?: boolean;  // shows a "..." indicator while bot is "thinking"
};
```

Behavior:
- Render `count` CardBack components, slightly overlapping
- If `thinking` is true, show a pulse animation or "..." badge

### Step 5 — Pool (`components/Pool.tsx`)

Props:
```typescript
type PoolProps = {
  count: number;
};
```

- A stack of 1–3 CardBack components (visually stacked with offset)
- A label "Pool: N cards left" underneath
- If `count === 0`, show empty placeholder ("Pool empty")

### Step 6 — Books (`components/Books.tsx`)

Props:
```typescript
type BooksProps = {
  books: Card[][];         // each book is 4 cards of same rank
  ownerLabel: string;      // e.g. "You" or "Bot"
};
```

- Render each book as a small stack with the rank visible (just show one representative card with the rank symbol, smaller size)
- Books arranged horizontally
- Label above: "[ownerLabel]'s books: N"

### Step 7 — EventLog (`components/EventLog.tsx`)

Props:
```typescript
type EventLogProps = {
  events: GameEvent[];     // from GoFishState
  viewerPlayer: PlayerId;
};
```

- Scrolling list, newest at the bottom (or auto-scroll to newest)
- Each event rendered as a short readable line, perspective-aware:
  - `ask` (success, viewer is asker): "You asked Bot for 7s — got 2!"
  - `ask` (failure, viewer is asker): "You asked Bot for 7s..."
  - `ask` (success, viewer is target): "Bot asked you for 7s — gave 2."
  - `ask` (failure, viewer is target): "Bot asked you for 7s — none!"
  - `goFish` (viewer is the fisher): "Go Fish! You drew a Queen."
  - `goFish` (other player): "Bot went fishing."
  - `bookFormed`: "Bot completed a book of 7s!" or "You completed a book of 7s!"
  - `gameOver`: "Game over — you won!" / "Bot won." / "Tie!"
- Max height with overflow-y-auto, ~6 lines visible
- Use `viewerPlayer` to determine "You" vs. the other player's label

### Step 8 — GameOverBanner (`components/GameOverBanner.tsx`)

Props:
```typescript
type GameOverBannerProps = {
  winner: PlayerId | 'tie';
  viewerPlayer: PlayerId;
  bookCounts: { A: number; B: number };
  onNewGame: () => void;
};
```

- Centered overlay or banner
- Big headline: "You won!" / "Bot won!" / "It's a tie!"
- Book counts shown
- "Play again" button → calls `onNewGame`

### Step 9 — GameView (`components/GameView.tsx`)

**This is the central component. Build it perspective-aware from the start.**

Props:
```typescript
type GameViewProps = {
  state: GoFishState;
  viewerPlayer: PlayerId;
  opponentLabel: string;     // "Bot" today, opponent's name later
  isViewerTurn: boolean;
  opponentThinking?: boolean;
  selectedRank: Rank | null;
  onSelectRank: (rank: Rank | null) => void;
  onAskForCard: (rank: Rank) => void;
  onNewGame: () => void;
};
```

Layout (vertical on mobile, can stay vertical on desktop too, max-width container):
```
┌────────────────────────────────┐
│  Opponent's books              │  ← Books (opponent)
│  Opponent's hand (face-down)   │  ← OpponentHand
│                                │
│        Pool                    │  ← Pool (centered)
│                                │
│  Event log                     │  ← EventLog
│                                │
│  Your books                    │  ← Books (viewer)
│  Your hand (face-up)           │  ← Hand
│  [Ask for 7s] button           │  ← shown when rank selected + viewer's turn
└────────────────────────────────┘
```

When game is over, show `GameOverBanner` on top.

Logic:
- "Ask for X" button is only enabled when:
  - It's the viewer's turn (`isViewerTurn === true`)
  - A rank is selected
  - Game is not over
- Button label dynamically reads "Ask Bot for [Rank]s"
- The button calls `onAskForCard(selectedRank)`, parent handles state update

### Step 10 — Bot (`lib/bot/randomBot.ts`)

```typescript
import type { GoFishState, PlayerId } from '@/lib/games/gofish';
import { getLegalRanksToAsk } from '@/lib/games/gofish';
import type { Rank } from '@/lib/core/card';

export type BotMove = {
  target: PlayerId;
  rank: Rank;
};

/**
 * Picks a random legal move for the given player.
 * Returns null if the player has no legal moves (empty hand — shouldn't happen
 * in normal play because refill logic ensures hand is non-empty when turn starts).
 */
export function pickRandomMove(
  state: GoFishState,
  player: PlayerId,
  rng: () => number = Math.random,
): BotMove | null {
  const legalRanks = getLegalRanksToAsk(state, player);
  if (legalRanks.length === 0) return null;

  const rank = legalRanks[Math.floor(rng() * legalRanks.length)]!;
  const target: PlayerId = player === 'A' ? 'B' : 'A';
  return { target, rank };
}
```

That's it. The bot is deliberately dumb today — random legal moves only.

### Step 11 — Game page (`app/game/page.tsx`)

This is a **client component** (`'use client'` at top) that orchestrates everything.

State:
```typescript
const [state, setState] = useState<GoFishState>(() => createInitialState());
const [selectedRank, setSelectedRank] = useState<Rank | null>(null);
const [botThinking, setBotThinking] = useState(false);
```

Constants:
```typescript
const VIEWER: PlayerId = 'A';
const BOT: PlayerId = 'B';
```

Bot turn effect:
```typescript
useEffect(() => {
  if (state.phase === 'gameOver') return;
  if (state.currentPlayer !== BOT) return;

  setBotThinking(true);
  const timer = setTimeout(() => {
    const move = pickRandomMove(state, BOT);
    if (move) {
      setState((s) => askForCard(s, BOT, move.target, move.rank));
    }
    setBotThinking(false);
  }, 900); // 900ms feels natural — not too snappy, not too slow

  return () => {
    clearTimeout(timer);
    setBotThinking(false);
  };
}, [state]);
```

Handlers:
```typescript
function handleAsk(rank: Rank) {
  setState((s) => askForCard(s, VIEWER, BOT, rank));
  setSelectedRank(null);
}

function handleNewGame() {
  setState(createInitialState());
  setSelectedRank(null);
}
```

Render:
```typescript
return (
  <GameView
    state={state}
    viewerPlayer={VIEWER}
    opponentLabel="Bot"
    isViewerTurn={state.currentPlayer === VIEWER && state.phase === 'asking'}
    opponentThinking={botThinking}
    selectedRank={selectedRank}
    onSelectRank={setSelectedRank}
    onAskForCard={handleAsk}
    onNewGame={handleNewGame}
  />
);
```

### Step 12 — Landing page (`app/page.tsx`)

Minimal:
- Centered heading "iCards — Go Fish"
- "New game vs Bot" button → links to `/game`
- That's it. No marketing, no fluff.

---

### Styling guidance
- Use Tailwind utility classes throughout, no separate CSS files
- Background: soft green felt vibe (`bg-emerald-800` for the page background, cards on white)
- Container: `max-w-2xl mx-auto p-4` is plenty for now
- Mobile: should be usable on a phone — test by resizing browser to ~400px wide
- Don't over-design — clean and functional beats fancy. We polish later.

### Accessibility basics
- All clickable elements are real `<button>` elements
- Keyboard: Tab through cards, Enter to select, etc. — don't fight default browser behavior
- ARIA labels for opponent hand count ("Bot has 5 cards") and pool count

---

### Acceptance criteria
- [ ] `npm run dev` starts without errors
- [ ] Landing page at `/` shows "New game vs Bot" button
- [ ] `/game` displays a fresh hand of 7 cards, bot's 7 face-down cards, the pool, and empty book areas
- [ ] Clicking a card in your hand selects all cards of that rank and reveals an "Ask Bot for [Rank]s" button
- [ ] Clicking the ask button triggers the move, UI updates, then bot takes its turn after ~900ms
- [ ] Event log shows readable messages from the viewer's perspective
- [ ] When a book is formed (yours or bot's), it appears in the books area
- [ ] Game-over banner appears when game ends, "Play again" resets the state
- [ ] No console errors during a full playthrough
- [ ] All Day 1 tests still pass (`npm run test:run` green)

### Non-goals for Day 2
- ❌ No Supabase, no networking, no real multiplayer
- ❌ No second-tab simulation, no BroadcastChannel
- ❌ No card animations beyond simple Tailwind transitions
- ❌ No SVG cards — text-based is fine
- ❌ No sound effects
- ❌ No bot intelligence beyond random legal moves
- ❌ No persistence — refresh = new game (that's fine)
- ❌ No multiple game modes / settings screen

---

### Wrap-up
- Update `README.md`: add Day 2 status, mention "play with `npm run dev` and visit /game".
- Suggested commit: `Day 2: playable UI with random bot opponent`.
