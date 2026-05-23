import type { Rank } from "@/lib/core/card";
import {
  getLegalRanksToAsk,
  type GoFishState,
  type PlayerId,
} from "@/lib/games/gofish";

export type BotMove = {
  target: PlayerId;
  rank: Rank;
};

export function pickRandomMove(
  state: GoFishState,
  player: PlayerId,
  rng: () => number = Math.random,
): BotMove | null {
  const legalRanks = getLegalRanksToAsk(state, player);
  if (legalRanks.length === 0) {
    return null;
  }

  const rank = legalRanks[Math.floor(rng() * legalRanks.length)];
  if (rank === undefined) {
    return null;
  }

  const target: PlayerId = player === "A" ? "B" : "A";
  return { target, rank };
}
