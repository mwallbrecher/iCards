"use client";

import { useEffect, useState } from "react";
import { GameView } from "@/components/GameView";
import { pickRandomMove } from "@/lib/bot/randomBot";
import type { Rank } from "@/lib/core/card";
import {
  askForCard,
  createInitialState,
  type GoFishState,
  type PlayerId,
} from "@/lib/games/gofish";

const VIEWER: PlayerId = "A";
const BOT: PlayerId = "B";

type GameControllerProps = {
  initialState: GoFishState;
};

export function GameController({ initialState }: GameControllerProps) {
  const [state, setState] = useState<GoFishState>(() => initialState);
  const [selectedRank, setSelectedRank] = useState<Rank | null>(null);
  const botThinking = state.phase !== "gameOver" && state.currentPlayer === BOT;

  useEffect(() => {
    if (state.phase === "gameOver") {
      return;
    }

    if (state.currentPlayer !== BOT) {
      return;
    }

    const timer = window.setTimeout(() => {
      const move = pickRandomMove(state, BOT);
      if (move !== null) {
        setState((currentState) =>
          askForCard(currentState, BOT, move.target, move.rank),
        );
      }
    }, 900);

    return () => {
      window.clearTimeout(timer);
    };
  }, [state]);

  function handleAsk(rank: Rank) {
    setState((currentState) => askForCard(currentState, VIEWER, BOT, rank));
    setSelectedRank(null);
  }

  function handleNewGame() {
    setState(createInitialState());
    setSelectedRank(null);
  }

  return (
    <GameView
      state={state}
      viewerPlayer={VIEWER}
      opponentLabel="Bot"
      isViewerTurn={state.currentPlayer === VIEWER && state.phase === "asking"}
      opponentThinking={botThinking}
      selectedRank={selectedRank}
      onSelectRank={setSelectedRank}
      onAskForCard={handleAsk}
      onNewGame={handleNewGame}
    />
  );
}
