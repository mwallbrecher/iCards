"use client";

import type { PlayerId } from "@/lib/games/gofish";

type GameOverBannerProps = {
  winner: PlayerId | "tie";
  viewerPlayer: PlayerId;
  bookCounts: { A: number; B: number };
};

function headline(winner: PlayerId | "tie", viewerPlayer: PlayerId): string {
  if (winner === "tie") {
    return "It's a tie!";
  }

  return winner === viewerPlayer ? "You won!" : "Bot won!";
}

export function GameOverBanner({
  winner,
  viewerPlayer,
  bookCounts,
}: GameOverBannerProps) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-emerald-950/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-md border border-white/20 bg-white p-5 text-center text-gray-950 shadow-2xl">
        <h2 className="text-3xl font-bold">{headline(winner, viewerPlayer)}</h2>
        <p className="mt-3 text-sm text-gray-700">
          Books: You {bookCounts[viewerPlayer]} / Bot{" "}
          {bookCounts[viewerPlayer === "A" ? "B" : "A"]}
        </p>
      </div>
    </div>
  );
}
