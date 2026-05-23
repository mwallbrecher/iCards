import { describe, expect, test } from "vitest";
import { assertInvariant } from "@/lib/games/gofish/invariant";
import { createInitialState } from "@/lib/games/gofish";
import { seededRng } from "../../helpers/seeded-rng";

describe("Go Fish invariant", () => {
  test("freshly created state passes", () => {
    expect(() => assertInvariant(createInitialState(seededRng(1)))).not.toThrow();
  });

  test("duplicate card throws", () => {
    const state = createInitialState(seededRng(2));
    const duplicate = state.hands.A[0];
    if (duplicate === undefined) {
      throw new Error("Expected player A to have a card");
    }

    expect(() =>
      assertInvariant({
        ...state,
        pool: [duplicate, ...state.pool.slice(1)],
      }),
    ).toThrow(/unique/);
  });

  test("missing card throws", () => {
    const state = createInitialState(seededRng(3));

    expect(() =>
      assertInvariant({
        ...state,
        pool: state.pool.slice(1),
      }),
    ).toThrow(/expected 52 cards/);
  });
});
