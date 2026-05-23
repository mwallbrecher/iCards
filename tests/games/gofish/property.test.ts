import fc from "fast-check";
import { describe, expect, test } from "vitest";
import {
  askForCard,
  createInitialState,
  getLegalRanksToAsk,
  type PlayerId,
} from "@/lib/games/gofish";
import { assertInvariant } from "@/lib/games/gofish/invariant";
import { seededRng } from "../../helpers/seeded-rng";

describe("Go Fish properties", () => {
  test("1000 random games preserve the invariant", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000 }), (seed) => {
        const rng = seededRng(seed);
        let state = createInitialState(rng);

        let safety = 500;
        while (state.phase === "asking" && safety > 0) {
          safety -= 1;

          const legalRanks = getLegalRanksToAsk(state, state.currentPlayer);
          if (legalRanks.length === 0) {
            break;
          }

          const rank = legalRanks[Math.floor(rng() * legalRanks.length)];
          if (rank === undefined) {
            throw new Error("Expected a legal rank");
          }

          const target: PlayerId = state.currentPlayer === "A" ? "B" : "A";
          state = askForCard(state, state.currentPlayer, target, rank);

          expect(() => assertInvariant(state)).not.toThrow();
        }
      }),
      { numRuns: 1000 },
    );
  }, 15_000);
});
