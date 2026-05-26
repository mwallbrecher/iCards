"use client";

import { useEffect, useRef, useState } from "react";
import { DECORATION_ASSETS } from "@/lib/scene/decoration-config";
import {
  isDecorationEnabled,
  isRuntimeDecoration,
  isWaveDecoration,
  resolveDecorationFilePath,
} from "@/lib/scene/decorations";
import { TILE_SIZE } from "@/lib/scene/tileset";

const REFRESH_INTERVAL_MS = 500;
const DECORATION_FADE_MS = 220;

type DecorationLayerProps = {
  decorationOverrides?: Partial<Record<string, string>>;
  scale: number;
  seed: string;
  waveFrame: 0 | 1;
};

type DecorationSpriteProps = {
  filePath: string;
  fadeChanges: boolean;
  id: string;
  leftPx: number;
  scale: number;
  topPx: number;
};

function DecorationSprite({
  filePath,
  fadeChanges,
  id,
  leftPx,
  scale,
  topPx,
}: DecorationSpriteProps) {
  const currentFilePathRef = useRef(filePath);
  const [currentFilePath, setCurrentFilePath] = useState(filePath);
  const [previousFilePath, setPreviousFilePath] = useState<string | null>(null);
  const [isFadingIn, setIsFadingIn] = useState(false);

  useEffect(() => {
    if (filePath === currentFilePathRef.current) {
      return;
    }

    if (!fadeChanges) {
      currentFilePathRef.current = filePath;
      return;
    }

    setPreviousFilePath(currentFilePathRef.current);
    currentFilePathRef.current = filePath;
    setCurrentFilePath(filePath);
    setIsFadingIn(false);

    const frame = window.requestAnimationFrame(() => {
      setIsFadingIn(true);
    });
    const timeout = window.setTimeout(() => {
      setPreviousFilePath(null);
    }, DECORATION_FADE_MS);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [fadeChanges, filePath]);

  const imageStyle = {
    display: "block",
    imageRendering: "pixelated" as const,
    pointerEvents: "none" as const,
    transition: fadeChanges
      ? `opacity ${DECORATION_FADE_MS}ms ease-out`
      : undefined,
    userSelect: "none" as const,
  };
  const displayedFilePath = fadeChanges ? currentFilePath : filePath;

  return (
    <div
      aria-hidden
      data-decoration-id={id}
      data-decoration-src={displayedFilePath}
      style={{
        left: leftPx,
        pointerEvents: "none",
        position: "absolute",
        top: topPx,
        transform: `translateZ(0) scale(${scale})`,
        transformOrigin: "top left",
      }}
    >
      {!fadeChanges || previousFilePath === null ? null : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          src={previousFilePath}
          style={{
            ...imageStyle,
            left: 0,
            opacity: isFadingIn ? 0 : 1,
            position: "absolute",
            top: 0,
          }}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        src={displayedFilePath}
        style={{
          ...imageStyle,
          opacity:
            !fadeChanges || previousFilePath === null || isFadingIn ? 1 : 0,
        }}
      />
    </div>
  );
}

export function DecorationLayer({
  decorationOverrides = {},
  scale,
  seed,
  waveFrame,
}: DecorationLayerProps) {
  const [nowMs, setNowMs] = useState(0);
  const hasRuntimeDecorations = DECORATION_ASSETS.some(isRuntimeDecoration);
  const tilePx = Math.round(TILE_SIZE * scale);

  useEffect(() => {
    if (!hasRuntimeDecorations) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setNowMs(Date.now());
    });

    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, REFRESH_INTERVAL_MS);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(interval);
    };
  }, [hasRuntimeDecorations]);

  return (
    <>
      {DECORATION_ASSETS.map((asset) => {
        if (!isDecorationEnabled(asset)) {
          return null;
        }

        const resolvedFilePath = resolveDecorationFilePath(
          asset,
          seed,
          nowMs,
          waveFrame,
        );
        const filePath = decorationOverrides[asset.id] ?? resolvedFilePath;
        const fadeChanges =
          asset.change.kind !== "static" && !isWaveDecoration(asset);
        const leftPx = Math.round(asset.tileX * tilePx);
        const topPx = Math.round(asset.tileY * tilePx);
        const spriteScale = scale * asset.sizeMultiplier;

        return (
          <DecorationSprite
            fadeChanges={fadeChanges}
            filePath={filePath}
            id={asset.id}
            key={asset.id}
            leftPx={leftPx}
            scale={spriteScale}
            topPx={topPx}
          />
        );
      })}
    </>
  );
}
