import { describe, expect, test } from "vitest";
import { createDeck, RANKS, shuffle, SUITS } from "@/lib/core/card";
import { seededRng } from "../helpers/seeded-rng";

describe("card core", () => {
  test("createDeck produces 52 cards", () => {
    expect(createDeck()).toHaveLength(52);
  });

  test("all 52 card IDs are unique", () => {
    const deck = createDeck();
    expect(new Set(deck.map((card) => card.id)).size).toBe(52);
  });

  test("all ranks and suits are present", () => {
    const deck = createDeck();

    for (const rank of RANKS) {
      for (const suit of SUITS) {
        expect(deck).toContainEqual({
          id: `${suit}-${rank}`,
          rank,
          suit,
        });
      }
    }
  });

  test("shuffle with the same seeded RNG is deterministic", () => {
    const deck = createDeck();

    expect(shuffle(deck, seededRng(1234))).toEqual(shuffle(deck, seededRng(1234)));
  });

  test("shuffle does not mutate the original array", () => {
    const deck = createDeck();
    const original = [...deck];

    shuffle(deck, seededRng(5678));

    expect(deck).toEqual(original);
  });
});
