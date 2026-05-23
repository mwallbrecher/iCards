import type { Rank, Suit } from "@/lib/core/card";

export function suitSymbol(suit: Suit): string {
  switch (suit) {
    case "hearts":
      return "♥";
    case "diamonds":
      return "♦";
    case "clubs":
      return "♣";
    case "spades":
      return "♠";
  }
}

export function rankName(rank: Rank | string): string {
  switch (rank) {
    case "A":
      return "Ace";
    case "J":
      return "Jack";
    case "Q":
      return "Queen";
    case "K":
      return "King";
    default:
      return rank;
  }
}

export function rankPlural(rank: Rank | string): string {
  switch (rank) {
    case "A":
      return "Aces";
    case "J":
      return "Jacks";
    case "Q":
      return "Queens";
    case "K":
      return "Kings";
    default:
      return `${rank}s`;
  }
}

export function rankShortPlural(rank: Rank | string): string {
  return `${rank}s`;
}
