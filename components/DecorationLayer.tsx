"use client";

import { useEffect, useState } from "react";
import { DECORATION_PLACEMENTS } from "@/lib/scene/decoration-config";
import {
  DECORATION_ATLASES,
  DECORATION_SUB_ASSETS,
  resolveSubAssetVariant,
} from "@/lib/scene/decorations";
import { TILE_SIZE } from "@/lib/scene/tileset";

const REFRESH_INTERVAL_MS = 500;

type DecorationLayerProps = {
  scale: number;
  seed: string;
};

const hasAnimatedPlaced = DECORATION_SUB_ASSETS.some((subAsset) => {
  const placement = DECORATION_PLACEMENTS[subAsset.slotName];
  const kind = subAsset.variantBehavior.kind;

  return (
    placement !== null &&
    placement !== undefined &&
    (kind === "animated" || kind === "animated-column")
  );
});

export function DecorationLayer({ scale, seed }: DecorationLayerProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const tilePx = Math.round(TILE_SIZE * scale);

  useEffect(() => {
    if (!hasAnimatedPlaced) {
      return;
    }

    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <>
      {DECORATION_SUB_ASSETS.map((subAsset) => {
        const placement = DECORATION_PLACEMENTS[subAsset.slotName];

        if (placement === null || placement === undefined) {
          return null;
        }

        const atlas = DECORATION_ATLASES[subAsset.atlasKey];
        const variant = resolveSubAssetVariant(subAsset, seed, nowMs);
        const displayWidth = Math.round(subAsset.tileWidth * tilePx);
        const displayHeight = Math.round(subAsset.tileHeight * tilePx);
        const scaleFactor = displayWidth / subAsset.widthPx;
        const backgroundX = Math.round(variant.atlasX * scaleFactor);
        const backgroundY = Math.round(variant.atlasY * scaleFactor);
        const atlasDisplayWidth = Math.round(atlas.atlasWidth * scaleFactor);
        const atlasDisplayHeight = Math.round(atlas.atlasHeight * scaleFactor);
        const leftPx = Math.round(placement.tileX * tilePx);
        const topPx = Math.round(placement.tileY * tilePx);

        return (
          <div
            aria-hidden
            data-decoration-slot={subAsset.slotName}
            key={subAsset.slotName}
            style={{
              backgroundImage: `url(${atlas.path})`,
              backgroundPosition: `-${backgroundX}px -${backgroundY}px`,
              backgroundClip: "padding-box",
              backgroundRepeat: "no-repeat",
              backgroundSize: `${atlasDisplayWidth}px ${atlasDisplayHeight}px`,
              boxSizing: "border-box",
              height: displayHeight,
              imageRendering: "pixelated",
              left: leftPx,
              overflow: "hidden",
              pointerEvents: "none",
              position: "absolute",
              top: topPx,
              width: displayWidth,
            }}
          />
        );
      })}
    </>
  );
}
