"use client";

import type { Card as CoreCard, Rank } from "@/lib/core/card";
import { RANKS, SUITS } from "@/lib/core/card";
import { Card } from "@/components/Card";

type HandProps = {
  cards: CoreCard[];
  selectedRank: Rank | null;
  onSelectRank: (rank: Rank | null) => void;
  disabled?: boolean;
};

function sortCards(cards: CoreCard[]): CoreCard[] {
  return [...cards].sort((left, right) => {
    const rankDiff = RANKS.indexOf(left.rank) - RANKS.indexOf(right.rank);
    if (rankDiff !== 0) {
      return rankDiff;
    }

    return SUITS.indexOf(left.suit) - SUITS.indexOf(right.suit);
  });
}

export function Hand({
  cards,
  selectedRank,
  onSelectRank,
  disabled = false,
}: HandProps) {
  const sortedCards = sortCards(cards);
  const overlapClass = sortedCards.length > 8 ? "-ml-7 first:ml-0" : "-ml-3 first:ml-0";

  if (sortedCards.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-white/35 px-4 py-6 text-center text-sm text-emerald-50/80">
        No cards
      </div>
    );
  }

  return (
    <div
      className={[
        "flex min-h-32 items-end overflow-x-auto px-2 pb-2 pt-4",
        disabled ? "opacity-50" : "",
      ].join(" ")}
      aria-label="Your hand"
    >
      {sortedCards.map((card) => (
        <div key={card.id} className={overlapClass}>
          <Card
            card={card}
            size="lg"
            selected={selectedRank === card.rank}
            onClick={
              disabled
                ? undefined
                : () => {
                    onSelectRank(selectedRank === card.rank ? null : card.rank);
                  }
            }
          />
        </div>
      ))}
    </div>
  );
}
