"use client";

import type { CSSProperties } from "react";

export type CharacterAnimation = "idle" | "fishing";

type PixelCharacterProps = {
  /** Path to the sprite sheet, e.g. "/graphics/characters/fisher_cast.png" */
  spriteSheet: string;
  /** Width of a single frame in pixels */
  frameWidth: number;
  /** Height of a single frame in pixels */
  frameHeight: number;
  /** Total number of frames in the sheet */
  frameCount: number;
  /** Duration of the full animation cycle, in milliseconds */
  durationMs: number;
  /** Current animation state */
  animation: CharacterAnimation;
  /** Visual scale factor (1 = native size, 2 = double, etc.) */
  scale?: number;
  /** Mirror horizontally (useful for opponent character facing the other way) */
  flipped?: boolean;
  /** Called when a non-looping animation finishes */
  onAnimationComplete?: () => void;
};

/**
 * Renders a pixel-art character using a horizontal sprite sheet.
 * Frames must be laid out left-to-right with no padding.
 *
 * The "idle" state shows frame 0 as a static image.
 * The "fishing" state plays the full sheet once, then calls onAnimationComplete.
 *
 * Reusable for any character with a horizontal sprite sheet.
 */
export function PixelCharacter({
  spriteSheet,
  frameWidth,
  frameHeight,
  frameCount,
  durationMs,
  animation,
  scale = 2,
  flipped = false,
  onAnimationComplete,
}: PixelCharacterProps) {
  const displayWidth = frameWidth * scale;
  const displayHeight = frameHeight * scale;
  const sheetWidth = frameWidth * frameCount * scale;

  const baseStyle: CSSProperties = {
    width: displayWidth,
    height: displayHeight,
    backgroundImage: `url(${spriteSheet})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${sheetWidth}px ${displayHeight}px`,
    imageRendering: "pixelated",
    transform: flipped ? "scaleX(-1)" : undefined,
  };

  if (animation === "idle") {
    return <div style={{ ...baseStyle, backgroundPosition: "0 0" }} />;
  }

  const sheetEndOffset = -(frameWidth * frameCount * scale);
  const animationName = `character-fishing-${frameWidth}-${frameHeight}-${frameCount}-${String(scale).replaceAll(".", "_")}`;

  return (
    <>
      <style>{`
        @keyframes ${animationName} {
          from { background-position: 0 0; }
          to { background-position: ${sheetEndOffset}px 0; }
        }
      `}</style>
      <div
        style={{
          ...baseStyle,
          animation: `${animationName} ${durationMs}ms steps(${frameCount})`,
        }}
        onAnimationEnd={onAnimationComplete}
      />
    </>
  );
}
