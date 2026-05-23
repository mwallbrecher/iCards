"use client";

import { useEffect, useRef } from "react";
import { rankName, rankPlural, rankShortPlural } from "@/components/cardDisplay";
import type { GameEvent, PlayerId } from "@/lib/games/gofish";

type EventLogProps = {
  events: GameEvent[];
  viewerPlayer: PlayerId;
  opponentLabel: string;
};

function labelFor(player: PlayerId, viewerPlayer: PlayerId, opponentLabel: string): string {
  return player === viewerPlayer ? "You" : opponentLabel;
}

function gameOverMessage(
  event: Extract<GameEvent, { type: "gameOver" }>,
  viewerPlayer: PlayerId,
  opponentLabel: string,
) {
  if (event.winner === "tie") {
    return "Game over - tie!";
  }

  return event.winner === viewerPlayer
    ? "Game over - you won!"
    : `Game over - ${opponentLabel} won.`;
}

function eventMessage(
  event: GameEvent,
  viewerPlayer: PlayerId,
  opponentLabel: string,
): string {
  switch (event.type) {
    case "ask": {
      const rank = rankShortPlural(event.rank);
      const asker =
        event.from === viewerPlayer ? "You" : opponentLabel;
      const target =
        event.to === viewerPlayer ? "you" : opponentLabel;

      if (event.success) {
        return `${asker} asked ${target} for ${rank} - got ${event.cardsGiven}!`;
      }

      return `${asker} asked ${target} for ${rank} - none!`;
    }
    case "goFish":
      if (event.player === viewerPlayer) {
        return event.drewRank === null
          ? "Go Fish! The pool was empty."
          : `Go Fish! You drew a ${rankName(event.drewRank)}.`;
      }

      return `${opponentLabel} went fishing.`;
    case "bookFormed":
      return `${labelFor(event.player, viewerPlayer, opponentLabel)} completed a book of ${rankPlural(event.rank)}!`;
    case "gameOver":
      return gameOverMessage(event, viewerPlayer, opponentLabel);
  }
}

export function EventLog({ events, viewerPlayer, opponentLabel }: EventLogProps) {
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list !== null) {
      list.scrollTop = list.scrollHeight;
    }
  }, [events.length]);

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-emerald-50">Event log</h2>
      <div
        ref={listRef}
        className="max-h-36 overflow-y-auto rounded-md border border-white/15 bg-black/20 p-3 text-sm text-emerald-50 shadow-inner"
      >
        {events.length === 0 ? (
          <p className="text-emerald-50/70">New game started.</p>
        ) : (
          <ol className="space-y-1">
            {events.map((event, index) => (
              <li key={`${event.type}-${index}`}>
                {eventMessage(event, viewerPlayer, opponentLabel)}
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
