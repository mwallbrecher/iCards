"use client";

import { useEffect, useRef, useState } from "react";
import { DECORATION_ASSETS } from "@/lib/scene/decoration-config";
import {
  isDecorationEnabled,
  isRuntimeDecoration,
  resolveDecorationFilePath,
} from "@/lib/scene/decorations";
import { TILE_SIZE } from "@/lib/scene/tileset";

const REFRESH_INTERVAL_MS = 500;
const DECORATION_FADE_MS = 220;

type DecorationLayerProps = {
  scale: number;
  seed: string;
};

type DecorationSpriteProps = {
  filePath: string;
  id: string;
  leftPx: number;
  scale: number;
  topPx: number;
};

function DecorationSprite({
  filePath,
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
  }, [filePath]);

  const imageStyle = {
    display: "block",
    imageRendering: "pixelated" as const,
    pointerEvents: "none" as const,
    transition: `opacity ${DECORATION_FADE_MS}ms ease-out`,
    userSelect: "none" as const,
  };

  return (
    <div
      aria-hidden
      data-decoration-id={id}
      data-decoration-src={currentFilePath}
      style={{
        left: leftPx,
        pointerEvents: "none",
        position: "absolute",
        top: topPx,
        transform: `translateZ(0) scale(${scale})`,
        transformOrigin: "top left",
      }}
    >
      {previousFilePath === null ? null : (
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
        src={currentFilePath}
        style={{
          ...imageStyle,
          opacity: previousFilePath === null || isFadingIn ? 1 : 0,
        }}
      />
    </div>
  );
}

export function DecorationLayer({ scale, seed }: DecorationLayerProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const hasRuntimeDecorations = DECORATION_ASSETS.some(isRuntimeDecoration);
  const tilePx = Math.round(TILE_SIZE * scale);

  useEffect(() => {
    if (!hasRuntimeDecorations) {
      return;
    }

    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [hasRuntimeDecorations]);

  return (
    <>
      {DECORATION_ASSETS.map((asset) => {
        if (!isDecorationEnabled(asset)) {
          return null;
        }

        const filePath = resolveDecorationFilePath(asset, seed, nowMs);
        const leftPx = Math.round(asset.tileX * tilePx);
        const topPx = Math.round(asset.tileY * tilePx);

        return (
          <DecorationSprite
            filePath={filePath}
            id={asset.id}
            key={asset.id}
            leftPx={leftPx}
            scale={scale}
            topPx={topPx}
          />
        );
      })}
    </>
  );
}
