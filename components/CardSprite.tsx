import type { CSSProperties } from "react";
import type { Rank } from "@/lib/core/card";

export const CARD_HAND_ATLAS_PATH = "/graphics/cards/card-deck.png";
export const CARD_UI_ATLAS_PATH = "/graphics/cards/card-ui-deck.png";
export const CARD_WIDTH = 64;
export const CARD_HEIGHT = 96;
export const CARD_RANK_ORDER: readonly Rank[] = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
] as const;

export type CardSpriteAtlas = "hand" | "ui";
export type CardSpriteRank = Rank | "X";

const CARD_UI_RANK_ORDER: readonly CardSpriteRank[] = [
  ...CARD_RANK_ORDER,
  "X",
] as const;

type CardSpriteProps = {
  rank: CardSpriteRank;
  atlas?: CardSpriteAtlas;
  disabled?: boolean;
  onClick?: () => void;
  selected?: boolean;
  scale?: number;
};

function cardAtlasConfig(atlas: CardSpriteAtlas) {
  if (atlas === "ui") {
    return {
      path: CARD_UI_ATLAS_PATH,
      order: CARD_UI_RANK_ORDER,
    };
  }

  return {
    path: CARD_HAND_ATLAS_PATH,
    order: CARD_RANK_ORDER,
  };
}

function atlasColumnForRank(
  rank: CardSpriteRank,
  order: readonly CardSpriteRank[],
): number {
  const index = order.indexOf(rank);
  return index === -1 ? 0 : index;
}

export function CardSprite({
  rank,
  atlas = "hand",
  disabled = false,
  onClick,
  selected = false,
  scale = 1,
}: CardSpriteProps) {
  const atlasConfig = cardAtlasConfig(atlas);
  const width = Math.round(CARD_WIDTH * scale);
  const height = Math.round(CARD_HEIGHT * scale);
  const atlasWidth = Math.round(atlasConfig.order.length * CARD_WIDTH * scale);
  const atlasHeight = Math.round(CARD_HEIGHT * scale);
  const atlasColumn = atlasColumnForRank(rank, atlasConfig.order);

  const spriteStyle: CSSProperties = {
    width,
    height,
    backgroundImage: `url(${atlasConfig.path})`,
    backgroundPosition: `-${Math.round(atlasColumn * CARD_WIDTH * scale)}px 0px`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${atlasWidth}px ${atlasHeight}px`,
    imageRendering: "pixelated",
  };

  const className = [
    "block shrink-0 border-0 bg-transparent p-0",
    "transition duration-150 ease-out",
    selected ? "-translate-y-2 drop-shadow-[0_10px_14px_rgba(0,0,0,0.35)]" : "",
    onClick && !disabled
      ? "cursor-pointer hover:-translate-y-2 focus:outline-none focus:ring-2 focus:ring-white/80"
      : "cursor-default",
    disabled ? "opacity-70" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (onClick) {
    return (
      <button
        aria-label={`${rank} card`}
        aria-pressed={selected}
        className={className}
        data-card-atlas={atlas}
        data-card-rank={rank}
        disabled={disabled}
        onClick={onClick}
        style={spriteStyle}
        type="button"
      />
    );
  }

  return (
    <div
      aria-label={`${rank} card`}
      className={className}
      data-card-atlas={atlas}
      data-card-rank={rank}
      role="img"
      style={spriteStyle}
    />
  );
}
