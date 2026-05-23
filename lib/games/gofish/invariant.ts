import type { Card } from "@/lib/core/card";
import type { GoFishState } from "@/lib/games/gofish/state";
import { BOOK_SIZE, DECK_SIZE } from "@/lib/games/gofish/rules";

function flattenBooks(state: GoFishState): Card[] {
  return [...state.books.A.flat(), ...state.books.B.flat()];
}

export function assertInvariant(state: GoFishState): void {
  const allCards = [
    ...state.pool,
    ...state.hands.A,
    ...state.hands.B,
    ...flattenBooks(state),
  ];

  if (allCards.length !== DECK_SIZE) {
    throw new Error(
      `Invariant violated: expected ${DECK_SIZE} cards, found ${allCards.length}`,
    );
  }

  const ids = new Set(allCards.map((card) => card.id));
  if (ids.size !== DECK_SIZE) {
    throw new Error("Invariant violated: card IDs must be unique");
  }

  for (const [player, books] of Object.entries(state.books)) {
    for (const [index, book] of books.entries()) {
      if (book.length !== BOOK_SIZE) {
        throw new Error(
          `Invariant violated: ${player} book ${index} has ${book.length} cards`,
        );
      }

      const ranks = new Set(book.map((card) => card.rank));
      if (ranks.size !== 1) {
        throw new Error(
          `Invariant violated: ${player} book ${index} contains multiple ranks`,
        );
      }
    }
  }

  if (state.phase === "gameOver" && state.winner === undefined) {
    throw new Error("Invariant violated: gameOver phase requires a winner");
  }
}
