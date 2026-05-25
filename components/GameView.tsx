"use client";

import { useEffect, useRef, useState } from "react";
import type { Rank } from "@/lib/core/card";
import type { GameEvent, GoFishState, PlayerId } from "@/lib/games/gofish";
import { AnimationOverlay, type AnimPayload } from "@/components/AnimationOverlay";
import { Books } from "@/components/Books";
import { EventLog } from "@/components/EventLog";
import { GameOverBanner } from "@/components/GameOverBanner";
import { Hand } from "@/components/Hand";
import { OpponentHand } from "@/components/OpponentHand";
import {
  PixelCharacter,
  type CharacterAnimation,
} from "@/components/PixelCharacter";
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

  const prevLenRef = useRef(state.history.length);
  const [anim, setAnim] = useState<AnimPayload | null>(null);
  const [characterAnim, setCharacterAnim] =
    useState<CharacterAnimation>("idle");
  const [characterRunId, setCharacterRunId] = useState(0);
  const lastSeenHistoryLengthRef = useRef(state.history.length);

  useEffect(() => {
    const prevLength = lastSeenHistoryLengthRef.current;
    const newEvents = state.history.slice(prevLength);
    lastSeenHistoryLengthRef.current = state.history.length;

    const viewerWentFishing = newEvents.some(
      (event) => event.type === "goFish" && event.player === viewerPlayer,
    );

    if (viewerWentFishing) {
      setCharacterAnim("fishing");
      setCharacterRunId((runId) => runId + 1);
    }
  }, [state.history, viewerPlayer]);

  useEffect(() => {
    const currentLen = state.history.length;
    const prevLen = prevLenRef.current;
    prevLenRef.current = currentLen;

    if (currentLen <= prevLen) return;

    const newEvents = state.history.slice(prevLen);

    const bookEvent = newEvents.find(
      (e): e is Extract<GameEvent, { type: "bookFormed" }> => e.type === "bookFormed",
    );
    if (bookEvent) {
      setAnim({ type: "book-formed", rank: bookEvent.rank });
      const timer = window.setTimeout(() => setAnim(null), 3200);
      return () => window.clearTimeout(timer);
    }

    const askEvent = newEvents.find(
      (e): e is Extract<GameEvent, { type: "ask" }> => e.type === "ask",
    );
    if (!askEvent) return;

    let payload: AnimPayload;

    if (askEvent.from === viewerPlayer) {
      if (askEvent.success) {
        payload = { type: "you-got-cards", rank: askEvent.rank, count: askEvent.cardsGiven };
      } else {
        const fishEvent = newEvents.find(
          (e): e is Extract<GameEvent, { type: "goFish" }> =>
            e.type === "goFish" && e.player === viewerPlayer,
        );
        payload = { type: "you-drew", rank: fishEvent?.drewRank ?? null };
      }
    } else if (askEvent.to === viewerPlayer) {
      if (askEvent.success) {
        payload = { type: "they-asked-hit", rank: askEvent.rank, count: askEvent.cardsGiven };
      } else {
        payload = { type: "they-asked-miss", rank: askEvent.rank };
      }
    } else {
      return;
    }

    setAnim(payload);
    const timer = window.setTimeout(() => setAnim(null), 1900);
    return () => window.clearTimeout(timer);
  }, [state.history, viewerPlayer]);

  return (
    <main
      className="min-h-screen bg-emerald-800 bg-cover bg-center bg-no-repeat px-4 py-5 text-white"
      style={{ backgroundImage: "url('/graphics/background/background.png')" }}
    >
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

        <div className="flex items-start gap-4">
          <div className="shrink-0">
            <Pool count={state.pool.length} />
          </div>
          <div className="min-w-0 flex-1">
            <EventLog
              events={state.history}
              viewerPlayer={viewerPlayer}
              opponentLabel={opponentLabel}
            />
          </div>
        </div>
        <Books books={state.books[viewerPlayer]} ownerLabel="You" />

        <section className="space-y-3">
          <div className="my-4 flex justify-center">
            <PixelCharacter
              key={characterRunId}
              spriteSheet="/graphics/characters/fisher_cast.png"
              frameWidth={50}
              frameHeight={44}
              frameCount={21}
              durationMs={2100}
              animation={characterAnim}
              scale={3}
              onAnimationComplete={() => setCharacterAnim("idle")}
            />
          </div>
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

      <AnimationOverlay anim={anim} />
    </main>
  );
}
