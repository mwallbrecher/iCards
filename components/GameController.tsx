"use client";

import { useEffect, useState } from "react";
import {
  ASK_MISS_ANIMATION_TOTAL_MS,
  ASK_SUCCESS_ANIMATION_TOTAL_MS,
  GameView,
} from "@/components/GameView";
import { pickRandomMove } from "@/lib/bot/randomBot";
import type { Rank } from "@/lib/core/card";
import {
  askForCard,
  type GoFishState,
  type PlayerId,
} from "@/lib/games/gofish";

const VIEWER: PlayerId = "A";
const BOT: PlayerId = "B";
const BOT_BASE_THINKING_DELAY_MS = 900;
const BOT_ANIMATION_BUFFER_MS = 160;

type GameControllerProps = {
  initialState: GoFishState;
};

function botDelayForState(state: GoFishState) {
  const lastAskEvent = [...state.history]
    .reverse()
    .find((event) => event.type === "ask");

  if (lastAskEvent?.from !== VIEWER) {
    return BOT_BASE_THINKING_DELAY_MS;
  }

  return (
    (lastAskEvent.success
      ? ASK_SUCCESS_ANIMATION_TOTAL_MS
      : ASK_MISS_ANIMATION_TOTAL_MS) + BOT_ANIMATION_BUFFER_MS
  );
}

export function GameController({ initialState }: GameControllerProps) {
  const [state, setState] = useState<GoFishState>(() => initialState);

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
    }, botDelayForState(state));

    return () => {
      window.clearTimeout(timer);
    };
  }, [state]);

  function handleAsk(rank: Rank) {
    setState((currentState) => askForCard(currentState, VIEWER, BOT, rank));
  }

  return (
    <GameView
      state={state}
      viewerPlayer={VIEWER}
      isViewerTurn={state.currentPlayer === VIEWER && state.phase === "asking"}
      onAskForCard={handleAsk}
    />
  );
}
