import { describe, expect, test } from "vitest";
import { createDeck, type Card, type Rank } from "@/lib/core/card";
import {
  askForCard,
  checkAndFormBooks,
  checkGameEnd,
  type GoFishState,
} from "@/lib/games/gofish";
import { assertInvariant } from "@/lib/games/gofish/invariant";

function card(id: string): Card {
  const found = createDeck().find((candidate) => candidate.id === id);
  if (found === undefined) {
    throw new Error(`Unknown card ${id}`);
  }

  return found;
}

function baseState(overrides: Partial<GoFishState> = {}): GoFishState {
  const deck = createDeck();

  return {
    pool: deck.slice(12),
    hands: {
      A: deck.slice(0, 6),
      B: deck.slice(6, 12),
    },
    books: {
      A: [],
      B: [],
    },
    currentPlayer: "A",
    phase: "asking",
    history: [],
    ...overrides,
  };
}

function deckWithout(cardIds: readonly string[]): Card[] {
  const excluded = new Set(cardIds);
  return createDeck().filter((candidate) => !excluded.has(candidate.id));
}

function bookForRank(rank: Rank): Card[] {
  return createDeck().filter((candidate) => candidate.rank === rank);
}

function booksForRanks(ranks: readonly Rank[]): Card[][] {
  return ranks.map((rank) => bookForRank(rank));
}

describe("Go Fish logic", () => {
  test("successful ask transfers matching cards and ends the turn", () => {
    const state = baseState({
      hands: {
        A: [card("hearts-A")],
        B: [card("diamonds-A"), card("clubs-2")],
      },
      pool: createDeck().filter(
        (candidate) =>
          !["hearts-A", "diamonds-A", "clubs-2"].includes(candidate.id),
      ),
    });

    const next = askForCard(state, "A", "B", "A");

    expect(next.hands.A.map((held) => held.id)).toEqual([
      "hearts-A",
      "diamonds-A",
    ]);
    expect(next.hands.B.map((held) => held.id)).toEqual(["clubs-2"]);
    expect(next.currentPlayer).toBe("B");
    expect(next.history).toContainEqual({
      type: "ask",
      from: "A",
      to: "B",
      rank: "A",
      success: true,
      cardsGiven: 1,
    });
    expect(() => assertInvariant(next)).not.toThrow();
  });

  test("target draws when a successful ask empties their hand", () => {
    const pool = deckWithout(["hearts-A", "diamonds-A"]);
    const state = baseState({
      hands: {
        A: [card("hearts-A")],
        B: [card("diamonds-A")],
      },
      pool,
    });

    const next = askForCard(state, "A", "B", "A");

    expect(next.hands.B).toHaveLength(1);
    expect(next.hands.B[0]?.id).toBe(pool[0]?.id);
    expect(next.pool).toHaveLength(pool.length - 1);
    expect(() => assertInvariant(next)).not.toThrow();
  });

  test("target stays empty and game ends when a successful ask empties their hand with empty pool", () => {
    const state = baseState({
      hands: {
        A: [card("hearts-A")],
        B: [card("diamonds-A"), card("clubs-A"), card("spades-A")],
      },
      pool: [],
      books: {
        A: booksForRanks(["2", "3", "4", "5", "6", "7"]),
        B: booksForRanks(["8", "9", "10", "J", "Q", "K"]),
      },
    });

    const next = askForCard(state, "A", "B", "A");

    expect(next.hands.B).toHaveLength(0);
    expect(next.phase).toBe("gameOver");
    expect(next.winner).toBe("A");
    expect(() => assertInvariant(next)).not.toThrow();
  });

  test("both players refill in asker-then-target order", () => {
    const pool = deckWithout([
      "hearts-A",
      "diamonds-A",
      "clubs-A",
      "spades-A",
    ]);
    const state = baseState({
      hands: {
        A: [card("hearts-A")],
        B: [card("diamonds-A"), card("clubs-A"), card("spades-A")],
      },
      pool,
    });

    const next = askForCard(state, "A", "B", "A");

    expect(next.books.A).toHaveLength(1);
    expect(next.books.A[0]?.map((bookCard) => bookCard.id)).toEqual([
      "hearts-A",
      "diamonds-A",
      "clubs-A",
      "spades-A",
    ]);
    expect(next.hands.A.map((held) => held.id)).toEqual([pool[0]?.id]);
    expect(next.hands.B.map((held) => held.id)).toEqual([pool[1]?.id]);
    expect(next.pool).toHaveLength(pool.length - 2);
    expect(() => assertInvariant(next)).not.toThrow();
  });

  test("go fish draws a card from the pool", () => {
    const state = baseState({
      hands: {
        A: [card("hearts-A")],
        B: [card("clubs-2")],
      },
      pool: [
        card("spades-K"),
        ...createDeck().filter(
          (candidate) =>
            !["hearts-A", "clubs-2", "spades-K"].includes(candidate.id),
        ),
      ],
    });

    const next = askForCard(state, "A", "B", "A");

    expect(next.hands.A.map((held) => held.id)).toContain("spades-K");
    expect(next.pool[0]?.id).not.toBe("spades-K");
    expect(next.history).toContainEqual({
      type: "goFish",
      player: "A",
      drewRank: "K",
    });
    expect(next.currentPlayer).toBe("B");
    expect(() => assertInvariant(next)).not.toThrow();
  });

  test("book formation lays down 4 matching ranks", () => {
    const state = baseState({
      hands: {
        A: [
          card("hearts-A"),
          card("diamonds-A"),
          card("clubs-A"),
          card("spades-A"),
          card("hearts-2"),
        ],
        B: [card("clubs-2")],
      },
      pool: createDeck().filter(
        (candidate) =>
          ![
            "hearts-A",
            "diamonds-A",
            "clubs-A",
            "spades-A",
            "hearts-2",
            "clubs-2",
          ].includes(candidate.id),
      ),
    });

    const next = checkAndFormBooks(state, "A");

    expect(next.books.A).toHaveLength(1);
    expect(next.books.A[0]?.map((bookCard) => bookCard.rank)).toEqual([
      "A",
      "A",
      "A",
      "A",
    ]);
    expect(next.hands.A.map((held) => held.id)).toEqual(["hearts-2"]);
    expect(next.history).toContainEqual({
      type: "bookFormed",
      player: "A",
      rank: "A",
    });
    expect(() => assertInvariant(next)).not.toThrow();
  });

  test("asking for a rank the asker does not hold throws", () => {
    const state = baseState({
      hands: {
        A: [card("hearts-A")],
        B: [card("clubs-2")],
      },
    });

    expect(() => askForCard(state, "A", "B", "K")).toThrow(/must hold/);
  });

  test("asking yourself throws", () => {
    const state = baseState({
      hands: {
        A: [card("hearts-A")],
        B: [card("clubs-2")],
      },
    });

    expect(() => askForCard(state, "A", "A", "A")).toThrow(/themselves/);
  });

  test("wrong current player asking throws", () => {
    const state = baseState({
      currentPlayer: "B",
      hands: {
        A: [card("hearts-A")],
        B: [card("clubs-2")],
      },
    });

    expect(() => askForCard(state, "A", "B", "A")).toThrow(/B's turn/);
  });

  test("game ends when the pool is empty and a hand is empty", () => {
    const aBook = [
      card("hearts-A"),
      card("diamonds-A"),
      card("clubs-A"),
      card("spades-A"),
    ];
    const state = baseState({
      pool: [],
      hands: {
        A: [],
        B: createDeck().filter(
          (candidate) => !aBook.some((bookCard) => bookCard.id === candidate.id),
        ),
      },
      books: {
        A: [aBook],
        B: [],
      },
    });

    const next = checkGameEnd(state);

    expect(next.phase).toBe("gameOver");
    expect(next.winner).toBe("A");
    expect(next.history).toContainEqual({ type: "gameOver", winner: "A" });
    expect(() => assertInvariant(next)).not.toThrow();
  });
});
