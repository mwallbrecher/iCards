"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { DecorationLayer } from "@/components/DecorationLayer";
import {
  ATLAS_COLS,
  ATLAS_ROWS,
  PIER_ATLAS_COLS,
  PIER_ATLAS_ROWS,
  PIER_TILESET_PATH,
  TILESET_PATH,
  TILE_SIZE,
  WATER_BACKGROUND_COLOR,
} from "@/lib/scene/tileset";
import type { AtlasName, Scene, SceneCell } from "@/lib/scene/types";

const WAVE_INTERVAL_MS = 300;
const MAX_AUTO_SCALE = 10;
const VIGNETTE_INTENSITY = 0.35;
const VIGNETTE_INNER_RADIUS = "35%";
const SHIMMER_OPACITY = 0.7;
const WATER_DEPTH_CENTER_INTENSITY = 0.08;
const WATER_DEPTH_EDGE_INTENSITY = 0.15;

const waterDepthOverlayStyle: CSSProperties = {
  background: `radial-gradient(ellipse at center, rgba(255,255,255,${WATER_DEPTH_CENTER_INTENSITY}) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,${WATER_DEPTH_EDGE_INTENSITY}) 100%)`,
  inset: 0,
  mixBlendMode: "soft-light",
  pointerEvents: "none",
  position: "absolute",
};

const shimmerOverlayStyle: CSSProperties = {
  backgroundImage: [
    "repeating-linear-gradient(180deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 11px)",
    "repeating-linear-gradient(180deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 17px)",
    "repeating-linear-gradient(180deg, rgba(255,255,255,0.020) 0px, rgba(255,255,255,0.020) 1px, transparent 1px, transparent 23px)",
  ].join(", "),
  inset: 0,
  mixBlendMode: "screen",
  opacity: SHIMMER_OPACITY,
  pointerEvents: "none",
  position: "absolute",
};

const vignetteOverlayStyle: CSSProperties = {
  background: `radial-gradient(ellipse at center, transparent ${VIGNETTE_INNER_RADIUS}, rgba(0,0,0,${VIGNETTE_INTENSITY}) 100%)`,
  inset: 0,
  pointerEvents: "none",
  position: "absolute",
  zIndex: 12,
};

type SceneFit = "none" | "contain" | "cover";

type SceneRendererProps = {
  scene: Scene;
  /** Visual scale factor. Default is chosen responsively. */
  scale?: number;
  /** How the scene should fit into its viewport. */
  fit?: SceneFit;
  className?: string;
  style?: CSSProperties;
};

type ViewportSize = {
  devicePixelRatio: number;
  width: number;
  height: number;
  left: number;
  top: number;
};

type AtlasConfig = {
  cols: number;
  path: string;
  rows: number;
};

function useElementSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ViewportSize>({
    devicePixelRatio: 1,
    height: 0,
    left: 0,
    top: 0,
    width: 0,
  });

  useEffect(() => {
    const element = ref.current;

    if (element === null) {
      return;
    }

    const viewportElement = element;

    function updateSize() {
      const rect = viewportElement.getBoundingClientRect();
      setSize({
        devicePixelRatio: window.devicePixelRatio || 1,
        height: rect.height,
        left: rect.left,
        top: rect.top,
        width: rect.width,
      });
    }

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(viewportElement);
    window.addEventListener("resize", updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  return { ref, size };
}

function computeScale(
  scene: Scene,
  viewportSize: ViewportSize,
  fit: Exclude<SceneFit, "none">,
) {
  const baseWidth = scene.width * TILE_SIZE;
  const baseHeight = scene.height * TILE_SIZE;
  const scaleByWidth = viewportSize.width / baseWidth;
  const scaleByHeight = viewportSize.height / baseHeight;

  if (
    !Number.isFinite(scaleByWidth) ||
    !Number.isFinite(scaleByHeight) ||
    scaleByWidth <= 0 ||
    scaleByHeight <= 0
  ) {
    return 1;
  }

  const scale =
    fit === "cover"
      ? Math.max(scaleByWidth, scaleByHeight)
      : Math.min(scaleByWidth, scaleByHeight);

  return Math.min(scale, MAX_AUTO_SCALE);
}

function snapScaleToTilePixels(scale: number, fit: SceneFit) {
  const rawTilePx = TILE_SIZE * scale;
  const snappedTilePx =
    fit === "cover" ? Math.ceil(rawTilePx) : Math.round(rawTilePx);

  return Math.max(1, snappedTilePx);
}

function alignToDevicePixel(
  localOffset: number,
  viewportOffset: number,
  devicePixelRatio: number,
) {
  return (
    Math.round((viewportOffset + localOffset) * devicePixelRatio) /
      devicePixelRatio -
    viewportOffset
  );
}

export function SceneRenderer({
  scene,
  scale,
  fit = "none",
  className,
  style,
}: SceneRendererProps) {
  const [waveFrame, setWaveFrame] = useState<0 | 1>(0);
  const { ref: viewportRef, size: viewportSize } = useElementSize();

  useEffect(() => {
    const interval = window.setInterval(() => {
      setWaveFrame((frame) => (frame === 0 ? 1 : 0));
    }, WAVE_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, []);

  const rawScale =
    scale ?? (fit === "none" ? 1 : computeScale(scene, viewportSize, fit));
  const tilePx = snapScaleToTilePixels(rawScale, fit);
  const computedScale = tilePx / TILE_SIZE;
  const sceneWidthPx = scene.width * tilePx;
  const sceneHeightPx = scene.height * tilePx;
  const idealSceneLeftPx =
    fit === "none" ? 0 : (viewportSize.width - sceneWidthPx) / 2;
  const idealSceneTopPx =
    fit === "none" ? 0 : (viewportSize.height - sceneHeightPx) / 2;
  const sceneLeftPx = alignToDevicePixel(
    idealSceneLeftPx,
    viewportSize.left,
    viewportSize.devicePixelRatio,
  );
  const sceneTopPx = alignToDevicePixel(
    idealSceneTopPx,
    viewportSize.top,
    viewportSize.devicePixelRatio,
  );

  function atlasConfig(atlas: AtlasName): AtlasConfig {
    if (atlas === "pier") {
      return {
        cols: PIER_ATLAS_COLS,
        path: PIER_TILESET_PATH,
        rows: PIER_ATLAS_ROWS,
      };
    }

    return {
      cols: ATLAS_COLS,
      path: TILESET_PATH,
      rows: ATLAS_ROWS,
    };
  }

  function tileStyle(
    atlas: AtlasName,
    coord: { col: number; row: number },
    rowIndex: number,
    colIndex: number,
  ) {
    const config = atlasConfig(atlas);
    const roundedTilePx = Math.floor(Math.max(1, Math.round(tilePx)));
    const atlasWidthPx = Math.round(config.cols * roundedTilePx);
    const atlasHeightPx = Math.round(config.rows * roundedTilePx);
    const leftPx = Math.round(colIndex * roundedTilePx);
    const topPx = Math.round(rowIndex * roundedTilePx);
    const backgroundX = Math.floor(coord.col * roundedTilePx);
    const backgroundY = Math.floor(coord.row * roundedTilePx);

    return {
      width: roundedTilePx,
      height: roundedTilePx,
      backgroundImage: `url(${config.path})`,
      backgroundPosition: `-${backgroundX}px -${backgroundY}px`,
      backgroundClip: "padding-box",
      backgroundRepeat: "no-repeat",
      backgroundSize: `${atlasWidthPx}px ${atlasHeightPx}px`,
      boxSizing: "border-box" as const,
      imageRendering: "pixelated" as const,
      left: leftPx,
      overflow: "hidden",
      position: "absolute" as const,
      top: topPx,
      transform: "translateZ(0)",
      willChange: "background-position",
    };
  }

  function renderCellGrid(cells: SceneCell[][], layerKey: string) {
    return cells.map((row, rowIndex) =>
      row.map((cell, colIndex) => {
        if (cell.tile === null) {
          return null;
        }

        const coord = waveFrame === 0 ? cell.tile.frame0 : cell.tile.frame1;
        const detailCoord =
          cell.detailTile === undefined
            ? null
            : waveFrame === 0
              ? cell.detailTile.frame0
              : cell.detailTile.frame1;

        return (
          <div key={`${layerKey}-${rowIndex}-${colIndex}`}>
            <div style={tileStyle(cell.atlas, coord, rowIndex, colIndex)} />
            {detailCoord === null ? null : (
              <div
                style={tileStyle(cell.atlas, detailCoord, rowIndex, colIndex)}
              />
            )}
          </div>
        );
      }),
    );
  }

  return (
    <div
      className={className}
      ref={viewportRef}
      style={{
        backgroundColor: WATER_BACKGROUND_COLOR,
        height: fit === "none" ? sceneHeightPx : undefined,
        imageRendering: "pixelated",
        overflow: "hidden",
        position: "relative",
        width: fit === "none" ? sceneWidthPx : undefined,
        ...style,
      }}
    >
      <div
        aria-label={`Generated scene for seed ${scene.seed}`}
        style={{
          backgroundColor: WATER_BACKGROUND_COLOR,
          height: sceneHeightPx,
          imageRendering: "pixelated",
          left: sceneLeftPx,
          overflow: "hidden",
          position: "absolute",
          top: sceneTopPx,
          width: sceneWidthPx,
        }}
      >
        <div aria-hidden style={waterDepthOverlayStyle} />
        <div aria-hidden style={shimmerOverlayStyle} />
        {renderCellGrid(scene.cells, "grass")}
        {renderCellGrid(scene.pierCells, "pier")}
        <DecorationLayer scale={computedScale} seed={scene.seed ?? "default"} />
        <div aria-hidden style={vignetteOverlayStyle} />
      </div>
    </div>
  );
}
