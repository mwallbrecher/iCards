"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { SceneRenderer } from "@/components/SceneRenderer";
import { generateScene, generateSceneFromMaps } from "@/lib/scene/generator";

const MAP_SOURCE_ENDPOINT = "/dev/scene/map";
const MAP_REFRESH_MS = 1000;
const PHONE_VIEWPORT_STYLE = {
  aspectRatio: "9 / 16",
  width: "min(calc(100vw - 3rem), 427.5px, 43.875vh)",
} satisfies CSSProperties;

const FALLBACK_MAP = `
CCCCCCCCCCCC
CCCDCCCCDCCD
CCCCCCCCCCCC
BBBBBBBBBBBB
............
............
............
............
TTTTTTTTTTTT
CCCCDCCCCCCD
CCCCCCCCCDCC
CCDCCCCCCCCC
CCCCCCCCCCCC
`;

type SceneMapResponse = {
  grassMap: string;
  pierMap: string;
};

function createEmptyOverlayMap(mapSource: string): string {
  return mapSource
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => ".".repeat(line.length))
    .join("\n");
}

function formatMapSource({ grassMap, pierMap }: SceneMapResponse): string {
  return [
    "DEFAULT_MAP",
    grassMap.trim(),
    "",
    "DEFAULT_PIER_MAP",
    pierMap.trim(),
  ].join("\n");
}

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

function initialScene() {
  try {
    return generateScene();
  } catch {
    return generateSceneFromMaps(
      FALLBACK_MAP,
      createEmptyOverlayMap(FALLBACK_MAP),
      "default",
    );
  }
}

export default function SceneDevPage() {
  const [seed, setSeed] = useState("default");
  const [width, setWidth] = useState(8);
  const [height, setHeight] = useState(13);
  const [scale, setScale] = useState<number | undefined>(undefined);
  const [scene, setScene] = useState(initialScene);
  const [mapSource, setMapSource] = useState("");
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMap() {
      try {
        const response = await fetch(`${MAP_SOURCE_ENDPOINT}?t=${Date.now()}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Map request failed with ${response.status}`);
        }

        const maps = (await response.json()) as SceneMapResponse;
        const nextScene = generateSceneFromMaps(
          maps.grassMap,
          maps.pierMap,
          seed,
        );

        if (!cancelled) {
          setScene(nextScene);
          setMapSource(formatMapSource(maps));
          setMapError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setMapError(error instanceof Error ? error.message : "Map load failed");
        }
      }
    }

    loadMap();
    const interval = window.setInterval(loadMap, MAP_REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [seed]);

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 bg-slate-900 p-6 text-white">
      <h1 className="text-2xl font-bold tracking-normal">
        Scene generator dev page
      </h1>

      <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          Seed:
          <input
            className="rounded bg-slate-800 px-2 py-1 font-mono"
            onChange={(event) => setSeed(event.target.value)}
            type="text"
            value={seed}
          />
        </label>
        <button
          className="rounded bg-emerald-700 px-3 py-1 font-semibold transition hover:bg-emerald-600"
          onClick={() => setSeed(randomSeed())}
          type="button"
        >
          Random seed
        </button>
        <label className="flex items-center gap-2">
          Width:
          <input
            className="w-16 rounded bg-slate-800 px-2 py-1"
            max={20}
            min={4}
            onChange={(event) =>
              setWidth(Number.parseInt(event.target.value, 10) || 8)
            }
            type="number"
            value={width}
          />
        </label>
        <label className="flex items-center gap-2">
          Height:
          <input
            className="w-16 rounded bg-slate-800 px-2 py-1"
            max={30}
            min={6}
            onChange={(event) =>
              setHeight(Number.parseInt(event.target.value, 10) || 13)
            }
            type="number"
            value={height}
          />
        </label>
        <label className="flex items-center gap-2">
          Scale:
          <select
            className="rounded bg-slate-800 px-2 py-1"
            onChange={(event) => {
              setScale(
                event.target.value === "auto"
                  ? undefined
                  : Number.parseInt(event.target.value, 10),
              );
            }}
            value={scale ?? "auto"}
          >
            <option value="auto">auto</option>
            <option value="2">2x</option>
            <option value="3">3x</option>
            <option value="4">4x</option>
            <option value="5">5x</option>
            <option value="6">6x</option>
            <option value="7">7x</option>
            <option value="8">8x</option>
            <option value="10">10x</option>
          </select>
        </label>
      </div>

      <div
        className="overflow-hidden border border-slate-700 bg-black"
        style={PHONE_VIEWPORT_STYLE}
      >
        <SceneRenderer
          className="h-full w-full"
          fit="cover"
          scale={scale}
          scene={scene}
        />
      </div>

      <div className="max-w-md text-center font-mono text-xs text-slate-400">
        <p>Seed: {seed}</p>
        <p>
          Dimensions: {scene.width} x {scene.height} tiles
        </p>
        <p className="mt-2 text-slate-500">
          Live map source: lib/scene/generator.ts
        </p>
        {mapError === null ? null : (
          <p className="mt-2 whitespace-pre-wrap text-red-300">{mapError}</p>
        )}
        <p className="mt-2">
          Top coastline: [{scene.topIslandCoastline.join(", ")}]
        </p>
        <p>Bottom coastline: [{scene.bottomIslandCoastline.join(", ")}]</p>
        <pre className="mt-3 max-w-full overflow-auto bg-slate-950/60 p-3 text-left leading-tight text-slate-300">
          {mapSource.trim()}
        </pre>
      </div>
    </main>
  );
}
