import { createDeck, shuffle, type Card } from "@/lib/core/card";
import type { PlayerId } from "@/lib/core/types";
import { assertInvariant } from "@/lib/games/gofish/invariant";
import { checkAndFormBooks } from "@/lib/games/gofish/logic";
import { HAND_SIZE } from "@/lib/games/gofish/rules";

export type { PlayerId };

export type Phase = "asking" | "gameOver";

export type GameEvent =
  | {
      type: "ask";
      from: PlayerId;
      to: PlayerId;
      rank: string;
      success: boolean;
      cardsGiven: number;
    }
  | { type: "goFish"; player: PlayerId; drewRank: string | null }
  | { type: "bookFormed"; player: PlayerId; rank: string }
  | { type: "gameOver"; winner: PlayerId | "tie" };

export type GoFishState = {
  pool: Card[];
  hands: Record<PlayerId, Card[]>;
  books: Record<PlayerId, Card[][]>;
  currentPlayer: PlayerId;
  phase: Phase;
  history: GameEvent[];
  winner?: PlayerId | "tie";
};

export function createInitialState(rng?: () => number): GoFishState {
  const deck = shuffle(createDeck(), rng);

  const initialState: GoFishState = {
    hands: {
      A: deck.slice(0, HAND_SIZE),
      B: deck.slice(HAND_SIZE, HAND_SIZE * 2),
    },
    pool: deck.slice(HAND_SIZE * 2),
    books: {
      A: [],
      B: [],
    },
    currentPlayer: "A",
    phase: "asking",
    history: [],
  };

  const state = checkAndFormBooks(checkAndFormBooks(initialState, "A"), "B");
  assertInvariant(state);

  return state;
}
