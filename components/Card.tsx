import type { Card as CoreCard } from "@/lib/core/card";
import { suitSymbol } from "@/components/cardDisplay";

type CardSize = "sm" | "md" | "lg";

type CardProps = {
  card: CoreCard;
  selected?: boolean;
  onClick?: () => void;
  size?: CardSize;
};

const sizeClasses: Record<CardSize, string> = {
  sm: "h-16 w-11 text-sm",
  md: "h-24 w-16 text-base",
  lg: "h-28 w-20 text-lg",
};

const suitSizeClasses: Record<CardSize, string> = {
  sm: "text-2xl",
  md: "text-4xl",
  lg: "text-5xl",
};

function suitColor(suit: CoreCard["suit"]): string {
  return suit === "hearts" || suit === "diamonds"
    ? "text-red-600"
    : "text-gray-900";
}

export function Card({
  card,
  selected = false,
  onClick,
  size = "md",
}: CardProps) {
  const cardClasses = [
    "relative shrink-0 rounded-md border border-gray-300 bg-white shadow-sm",
    "flex items-center justify-center font-semibold",
    sizeClasses[size],
    suitColor(card.suit),
    selected ? "-translate-y-1 ring-2 ring-blue-500" : "",
    onClick
      ? "cursor-pointer transition hover:-translate-y-1 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <span className="absolute left-1.5 top-1 leading-none">{card.rank}</span>
      <span className={suitSizeClasses[size]} aria-hidden="true">
        {suitSymbol(card.suit)}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={cardClasses}
        onClick={onClick}
        aria-pressed={selected}
        aria-label={`${card.rank} of ${card.suit}`}
      >
        {content}
      </button>
    );
  }

  return <div className={cardClasses}>{content}</div>;
}
