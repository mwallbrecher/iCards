"use client";

import { useEffect, useState } from "react";
import { DECORATION_ASSETS } from "@/lib/scene/decoration-config";
import {
  isDecorationEnabled,
  isRuntimeDecoration,
  resolveDecorationFilePath,
} from "@/lib/scene/decorations";
import { TILE_SIZE } from "@/lib/scene/tileset";

const REFRESH_INTERVAL_MS = 500;

type DecorationLayerProps = {
  scale: number;
  seed: string;
};

const hasRuntimeDecorations = DECORATION_ASSETS.some(isRuntimeDecoration);

export function DecorationLayer({ scale, seed }: DecorationLayerProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const tilePx = Math.round(TILE_SIZE * scale);

  useEffect(() => {
    if (!hasRuntimeDecorations) {
      return;
    }

    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, []);

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
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            aria-hidden
            data-decoration-id={asset.id}
            key={asset.id}
            src={filePath}
            style={{
              display: "block",
              imageRendering: "pixelated",
              left: leftPx,
              pointerEvents: "none",
              position: "absolute",
              top: topPx,
              transform: `translateZ(0) scale(${scale})`,
              transformOrigin: "top left",
              userSelect: "none",
            }}
          />
        );
      })}
    </>
  );
}
