import { RANKS, type Card, type Rank } from "@/lib/core/card";
import type { PlayerId } from "@/lib/core/types";
import { assertInvariant } from "@/lib/games/gofish/invariant";
import type { GameEvent, GoFishState } from "@/lib/games/gofish/state";

type Zone =
  | { kind: "pool" }
  | { kind: "hand"; player: PlayerId }
  | { kind: "book"; player: PlayerId; bookIndex: number };

function otherPlayer(player: PlayerId): PlayerId {
  return player === "A" ? "B" : "A";
}

function appendHistory(state: GoFishState, events: GameEvent[]): GoFishState {
  return {
    ...state,
    history: [...state.history, ...events],
  };
}

function cardsInZone(state: GoFishState, zone: Zone): Card[] {
  if (zone.kind === "pool") {
    return state.pool;
  }

  if (zone.kind === "hand") {
    return state.hands[zone.player];
  }

  const book = state.books[zone.player][zone.bookIndex];
  if (book === undefined) {
    throw new Error(`Book ${zone.bookIndex} does not exist for player ${zone.player}`);
  }

  return book;
}

function removeCardsFromZone(
  state: GoFishState,
  cardIds: readonly string[],
  zone: Zone,
): GoFishState {
  const cardIdSet = new Set(cardIds);

  if (zone.kind === "pool") {
    return {
      ...state,
      pool: state.pool.filter((card) => !cardIdSet.has(card.id)),
    };
  }

  if (zone.kind === "hand") {
    return {
      ...state,
      hands: {
        ...state.hands,
        [zone.player]: state.hands[zone.player].filter(
          (card) => !cardIdSet.has(card.id),
        ),
      },
    };
  }

  return {
    ...state,
    books: {
      ...state.books,
      [zone.player]: state.books[zone.player].map((book, index) =>
        index === zone.bookIndex
          ? book.filter((card) => !cardIdSet.has(card.id))
          : book,
      ),
    },
  };
}

function addCardsToZone(
  state: GoFishState,
  cards: readonly Card[],
  zone: Exclude<Zone, { kind: "book" }>,
): GoFishState {
  if (zone.kind === "pool") {
    return {
      ...state,
      pool: [...state.pool, ...cards],
    };
  }

  return {
    ...state,
    hands: {
      ...state.hands,
      [zone.player]: [...state.hands[zone.player], ...cards],
    },
  };
}

function moveCards(
  state: GoFishState,
  cardIds: readonly string[],
  from: Zone,
  to: Exclude<Zone, { kind: "book" }>,
): GoFishState {
  const fromCards = cardsInZone(state, from);
  const foundCards = cardIds.map((id) => {
    const card = fromCards.find((candidate) => candidate.id === id);
    if (card === undefined) {
      throw new Error(`Card ${id} is not in ${from.kind}`);
    }

    return card;
  });

  return addCardsToZone(removeCardsFromZone(state, cardIds, from), foundCards, to);
}

function addBook(state: GoFishState, player: PlayerId, cards: readonly Card[]): GoFishState {
  if (cards.length !== 4) {
    throw new Error(`Cannot form a book with ${cards.length} cards`);
  }

  const rank = cards[0]?.rank;
  if (rank === undefined || cards.some((card) => card.rank !== rank)) {
    throw new Error("Cannot form a book with mixed ranks");
  }

  return appendHistory(
    {
      ...state,
      books: {
        ...state.books,
        [player]: [...state.books[player], [...cards]],
      },
    },
    [{ type: "bookFormed", player, rank }],
  );
}

function drawOneFromPool(state: GoFishState, player: PlayerId): GoFishState {
  const drawnCard = state.pool[0];
  if (drawnCard === undefined) {
    return state;
  }

  return moveCards(state, [drawnCard.id], { kind: "pool" }, { kind: "hand", player });
}

export function checkAndFormBooks(
  state: GoFishState,
  player: PlayerId,
): GoFishState {
  const hand = state.hands[player];
  const bookRanks = RANKS.filter(
    (rank) => hand.filter((card) => card.rank === rank).length === 4,
  );

  const stateWithBooks = bookRanks.reduce((nextState, rank) => {
    const bookCards = nextState.hands[player].filter((card) => card.rank === rank);
    const stateWithoutBookCards = removeCardsFromZone(
      nextState,
      bookCards.map((card) => card.id),
      { kind: "hand", player },
    );

    return addBook(stateWithoutBookCards, player, bookCards);
  }, state);

  return stateWithBooks;
}

function refillEmptyHand(state: GoFishState, player: PlayerId): GoFishState {
  if (state.hands[player].length > 0 || state.pool.length === 0) {
    return state;
  }

  const afterDraw = checkAndFormBooks(drawOneFromPool(state, player), player);
  return refillEmptyHand(afterDraw, player);
}

export function checkGameEnd(state: GoFishState): GoFishState {
  if (
    state.phase === "gameOver" ||
    state.pool.length > 0 ||
    (state.hands.A.length > 0 && state.hands.B.length > 0)
  ) {
    return state;
  }

  const winner =
    state.books.A.length > state.books.B.length
      ? "A"
      : state.books.B.length > state.books.A.length
        ? "B"
        : "tie";

  return appendHistory(
    {
      ...state,
      phase: "gameOver",
      winner,
    },
    [{ type: "gameOver", winner }],
  );
}

export function askForCard(
  state: GoFishState,
  asker: PlayerId,
  target: PlayerId,
  rank: Rank,
): GoFishState {
  if (state.phase !== "asking") {
    throw new Error("Cannot ask for cards unless the game is in the asking phase");
  }

  if (asker !== state.currentPlayer) {
    throw new Error(`It is ${state.currentPlayer}'s turn`);
  }

  if (asker === target) {
    throw new Error("A player cannot ask themselves for cards");
  }

  if (!state.hands[asker].some((card) => card.rank === rank)) {
    throw new Error(`Player ${asker} must hold at least one ${rank} to ask for it`);
  }

  const matchingTargetCards = state.hands[target].filter((card) => card.rank === rank);
  const askEvent: GameEvent = {
    type: "ask",
    from: asker,
    to: target,
    rank,
    success: matchingTargetCards.length > 0,
    cardsGiven: matchingTargetCards.length,
  };

  const stateAfterAsk = appendHistory(state, [askEvent]);

  const stateAfterCards =
    matchingTargetCards.length > 0
      ? moveCards(
          stateAfterAsk,
          matchingTargetCards.map((card) => card.id),
          { kind: "hand", player: target },
          { kind: "hand", player: asker },
        )
      : appendHistory(drawOneFromPool(stateAfterAsk, asker), [
          {
            type: "goFish",
            player: asker,
            drewRank: stateAfterAsk.pool[0]?.rank ?? null,
          },
        ]);

  const stateAfterAskerBooks = checkAndFormBooks(stateAfterCards, asker);
  const stateAfterAskerRefill = refillEmptyHand(stateAfterAskerBooks, asker);
  const stateAfterTargetBooks = checkAndFormBooks(stateAfterAskerRefill, target);
  const stateAfterBooks = refillEmptyHand(stateAfterTargetBooks, target);
  const stateAfterTurn = {
    ...stateAfterBooks,
    currentPlayer: otherPlayer(asker),
  };
  const finishedState = checkGameEnd(stateAfterTurn);

  assertInvariant(finishedState);

  return finishedState;
}

export function getLegalRanksToAsk(
  state: GoFishState,
  player: PlayerId,
): Rank[] {
  return RANKS.filter((rank) =>
    state.hands[player].some((card) => card.rank === rank),
  );
}
