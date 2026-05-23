export { createInitialState } from "@/lib/games/gofish/state";
export {
  askForCard,
  checkAndFormBooks,
  checkGameEnd,
  getLegalRanksToAsk,
} from "@/lib/games/gofish/logic";
export type {
  GameEvent,
  GoFishState,
  Phase,
  PlayerId,
} from "@/lib/games/gofish/state";
