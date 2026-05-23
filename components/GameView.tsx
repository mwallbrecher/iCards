"use client";

import type { Rank } from "@/lib/core/card";
import type { GoFishState, PlayerId } from "@/lib/games/gofish";
import { Books } from "@/components/Books";
import { EventLog } from "@/components/EventLog";
import { GameOverBanner } from "@/components/GameOverBanner";
import { Hand } from "@/components/Hand";
import { OpponentHand } from "@/components/OpponentHand";
import { Pool } from "@/components/Pool";
import { rankShortPlural } from "@/components/cardDisplay";

type GameViewProps = {
  state: GoFishState;
  viewerPlayer: PlayerId;
  opponentLabel: string;
  isViewerTurn: boolean;
  opponentThinking?: boolean;
  selectedRank: Rank | null;
  onSelectRank: (rank: Rank | null) => void;
  onAskForCard: (rank: Rank) => void;
  onNewGame: () => void;
  showGameOverNewGameButton?: boolean;
};

function otherPlayer(player: PlayerId): PlayerId {
  return player === "A" ? "B" : "A";
}

export function GameView({
  state,
  viewerPlayer,
  opponentLabel,
  isViewerTurn,
  opponentThinking = false,
  selectedRank,
  onSelectRank,
  onAskForCard,
  onNewGame,
  showGameOverNewGameButton = true,
}: GameViewProps) {
  const opponent = otherPlayer(viewerPlayer);
  const canAsk =
    isViewerTurn && selectedRank !== null && state.phase !== "gameOver";

  return (
    <main className="min-h-screen bg-emerald-800 px-4 py-5 text-white">
      <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-5">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-normal">Go Fish</h1>
            <p className="text-sm text-emerald-50/80">
              {state.currentPlayer === viewerPlayer ? "Your turn" : `${opponentLabel}'s turn`}
            </p>
          </div>
          <button
            type="button"
            onClick={onNewGame}
            className="rounded-md border border-white/25 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/60"
          >
            New game
          </button>
        </header>

        <Books books={state.books[opponent]} ownerLabel={opponentLabel} />
        <OpponentHand
          count={state.hands[opponent].length}
          thinking={opponentThinking}
        />

        <div className="flex justify-center py-2">
          <Pool count={state.pool.length} />
        </div>

        <EventLog
          events={state.history}
          viewerPlayer={viewerPlayer}
          opponentLabel={opponentLabel}
        />
        <Books books={state.books[viewerPlayer]} ownerLabel="You" />

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-emerald-50">Your hand</h2>
            <p className="text-xs text-emerald-50/75">
              {state.hands[viewerPlayer].length} cards
            </p>
          </div>
          <Hand
            cards={state.hands[viewerPlayer]}
            selectedRank={selectedRank}
            onSelectRank={onSelectRank}
            disabled={!isViewerTurn || state.phase === "gameOver"}
          />
          {selectedRank !== null ? (
            <button
              type="button"
              disabled={!canAsk}
              onClick={() => {
                onAskForCard(selectedRank);
              }}
              className="w-full rounded-md bg-white px-4 py-3 text-base font-bold text-emerald-900 shadow-sm transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-white/80 disabled:cursor-not-allowed disabled:bg-white/50 disabled:text-emerald-950/50"
            >
              Ask {opponentLabel} for {rankShortPlural(selectedRank)}
            </button>
          ) : null}
        </section>

        {state.phase === "gameOver" && state.winner !== undefined ? (
          <GameOverBanner
            winner={state.winner}
            viewerPlayer={viewerPlayer}
            bookCounts={{
              A: state.books.A.length,
              B: state.books.B.length,
            }}
          />
        ) : null}

        {state.phase === "gameOver" && showGameOverNewGameButton ? (
          <button
            type="button"
            onClick={onNewGame}
            className="fixed bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-md bg-white px-4 py-3 text-sm font-bold text-emerald-900 shadow-xl transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-white/80"
          >
            Play again
          </button>
        ) : null}
      </div>
    </main>
  );
}
