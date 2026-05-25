# Codex Prompt — Procedural Scene Generator (Day 7)

> Copy this entire prompt into a fresh Codex chat in VS Code. It builds a procedural scene generator (top island + water + bottom island) with deterministic seeding, renders the scene with synchronized wave animation, and provides a dev test page to visualize different seeds.

---

## Task: Build a deterministic, seeded scene generator and visual renderer for the island/water layout, with synchronized wave animation across all coastline tiles.

### Context
A tileset mapping already exists at `lib/scene/tileset.ts` with named coordinates for grass tiles, bottom-coastline tiles (with wave-frame variants), and grass detail tiles. The user has placed:
- The tileset atlas at `public/graphics/tilemap/grass_maptile.png` (32×32 tiles, 5 cols × 11 rows)
- The character sprite at `public/graphics/characters/fisher_cast.png` (already wired into `PixelCharacter`)

This task does NOT integrate the scene into the game UI yet. It produces an isolated scene-rendering system testable on a dev page. Game integration is a separate later task.

### Architecture
Three new files:
1. **`lib/scene/types.ts`** — Scene data structures (pure types).
2. **`lib/scene/generator.ts`** — Pure function: `generateScene(seed: string, opts) → Scene`.
3. **`components/SceneRenderer.tsx`** — Renders a Scene with wave animation and responsive scaling.

Plus a dev page at `app/dev/scene/page.tsx` to visualize.

### Geometry decisions (already made)
- **Both islands are rectangular** — no irregular coastlines yet (those need rows 4-7 of the atlas which aren't mapped).
- **No piers yet** — added in a future task once coastline generation is verified.
- **Both players see the same scene** — deterministic via seed (game id).
- **Variation:** between scenes (different seeds), the islands and water look distinct via random selection from grass detail tile variants. Inter-game variation is implicit in the seed. Within a single scene, variation comes from sprinkled grass details on land.
- **Scene dimensions:** 8 columns × 13 rows (default; configurable).
- **Layout:**
  - Rows 0-4 (5 rows): top island
  - Row 5: bottom-coastline of top island (water below)
  - Rows 6-7 (2 rows): pure water (just background color)
  - Row 8: bottom-coastline of bottom island, but mirrored vertically (this is the TOP coastline of the bottom island)
  - Rows 9-12 (4 rows): bottom island

**Important note about the top edge of the bottom island:**
The atlas does NOT have separate top-coastline-with-water tiles (those would be in rows 4-7 of the atlas, currently unmapped). For the top edge of the bottom island, we have two choices:
- **(a) Vertically flip the bottom-coastline tiles via CSS `transform: scaleY(-1)`** to fake the top-coastline of the bottom island.
- **(b) Just use `GRASS_TILE_TOP_*` tiles (no wave animation) for the top edge of the bottom island**, since in Stardew perspective the top edge doesn't show water contact anyway.

**Go with option (b).** It's cleaner and matches the Stardew perspective (top edges of islands are just grass, no rocky water edge). The bottom island's top edge uses `GRASS_TILE_TOP_LEFT / TOP_MID / TOP_RIGHT` exactly like the top island's top edge does. No flipping.

So the actual layout simplifies to:
- **Top island (rows 0-4):** uses TOP edge tiles at row 0, LEFT/RIGHT edges at cols 0 and 7, CENTER fill in the middle, BOTTOM edge tiles at row 4 (these ARE the wave-animated water tiles).
- **Water gap (rows 5-7):** transparent / water background color only.
- **Bottom island (rows 8-12):** uses TOP edge tiles at row 8 (just grass, no water), LEFT/RIGHT edges, CENTER fill, BOTTOM edge tiles at row 12 (these would normally be water-animated too, BUT row 12 is the bottom of the visible scene — see notes below).

**Bottom edge of the bottom island:**
For symmetry, the bottom island's bottom edge could also have water-animated tiles. But realistically, the bottom of the screen on phones gets cut off. To keep it simple: the bottom island's bottom edge uses `GRASS_TILE_BOTTOM_*` (the water-animated ones), just like the top island's bottom edge. If a user scrolls or the screen is tall enough to see it, they get the same coastline aesthetic.

Final per-row breakdown for an 8-wide scene:

```
Row 0:  [TOP_LEFT][TOP_MID][TOP_MID][TOP_MID][TOP_MID][TOP_MID][TOP_MID][TOP_RIGHT]
Row 1:  [LEFT_MID][CENTER ][CENTER ][CENTER ][CENTER ][CENTER ][CENTER ][RIGHT_MID]
Row 2:  [LEFT_MID][CENTER ][CENTER ][CENTER ][CENTER ][CENTER ][CENTER ][RIGHT_MID]
Row 3:  [LEFT_MID][CENTER ][CENTER ][CENTER ][CENTER ][CENTER ][CENTER ][RIGHT_MID]
Row 4:  [BOT_LEFT*][BOT_MID*][BOT_MID*][BOT_MID*][BOT_MID*][BOT_MID*][BOT_MID*][BOT_RIGHT*]   ← water-animated
Row 5:  [    water-bg     ]
Row 6:  [    water-bg     ]
Row 7:  [    water-bg     ]
Row 8:  [TOP_LEFT][TOP_MID][TOP_MID][TOP_MID][TOP_MID][TOP_MID][TOP_MID][TOP_RIGHT]
Row 9:  [LEFT_MID][CENTER ][CENTER ][CENTER ][CENTER ][CENTER ][CENTER ][RIGHT_MID]
Row 10: [LEFT_MID][CENTER ][CENTER ][CENTER ][CENTER ][CENTER ][CENTER ][RIGHT_MID]
Row 11: [LEFT_MID][CENTER ][CENTER ][CENTER ][CENTER ][CENTER ][CENTER ][RIGHT_MID]
Row 12: [BOT_LEFT*][BOT_MID*][BOT_MID*][BOT_MID*][BOT_MID*][BOT_MID*][BOT_RIGHT*][BOT_RIGHT*]   ← water-animated
```

Tiles marked `*` are wave-animated (swap between water0 and water1 frames every 300ms).

### Grass detail decoration
Random grass detail tiles (`GRASS_DETAIL_1..6`) are sprinkled on CENTER cells (never on edges or coastline) to add visual variety. Density:
- ~20% of CENTER cells get a random detail tile instead of plain CENTER
- Selection is deterministic based on the seed

---

## Step 1 — Create `lib/scene/types.ts`

```typescript
import type { WaveAnimatedTile } from "./tileset";

export type SceneCell = {
  /** The tile to render at this position. */
  tile: WaveAnimatedTile;
  /** Whether this cell sits on top of the water background (transparent). */
  isWater: boolean;
};

export type Scene = {
  width: number;   // columns
  height: number;  // rows
  cells: SceneCell[][];  // [row][col]
  /** The seed used to generate this scene, for debugging. */
  seed: string;
};

export type GenerateSceneOptions = {
  width?: number;        // default 8
  height?: number;       // default 13
  /** Density of grass detail tiles on land (0-1). Default 0.2 */
  detailDensity?: number;
};
```

---

## Step 2 — Create `lib/scene/generator.ts`

```typescript
import {
  TILE_GRASS_TOP_LEFT,
  TILE_GRASS_TOP_MID,
  TILE_GRASS_TOP_RIGHT,
  TILE_GRASS_LEFT_MID,
  TILE_GRASS_CENTER,
  TILE_GRASS_RIGHT_MID,
  TILE_GRASS_BOTTOM_LEFT,
  TILE_GRASS_BOTTOM_MID,
  TILE_GRASS_BOTTOM_RIGHT,
  TILE_WATER_BOTTOM_LEFT,
  TILE_WATER_BOTTOM_MID,
  TILE_WATER_BOTTOM_RIGHT,
  GRASS_DETAIL_TILES,
  type WaveAnimatedTile,
} from "./tileset";
import type { Scene, SceneCell, GenerateSceneOptions } from "./types";

/**
 * Mulberry32 — a small, fast, deterministic PRNG seeded from a 32-bit int.
 */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return function () {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hash a string into a 32-bit int for seeding.
 */
function hashSeed(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Generate the deterministic scene for a given seed.
 *
 * Layout (for an 8×13 scene):
 *   Rows 0-3: top island (top edge, center, with grass details sprinkled)
 *   Row 4: top island's bottom coastline (water-animated)
 *   Rows 5-7: water (transparent — water background color shows through)
 *   Row 8: bottom island's top edge (plain grass, no water contact)
 *   Rows 9-11: bottom island center (with grass details sprinkled)
 *   Row 12: bottom island's bottom coastline (water-animated)
 */
export function generateScene(
  seed: string,
  opts: GenerateSceneOptions = {},
): Scene {
  const width = opts.width ?? 8;
  const height = opts.height ?? 13;
  const detailDensity = opts.detailDensity ?? 0.2;

  const rng = mulberry32(hashSeed(seed));

  // Determine row boundaries
  // For an 8×13 scene:
  //   top island: rows 0-4 (5 rows), row 4 = bottom coastline
  //   water: rows 5-7 (3 rows)
  //   bottom island: rows 8-12 (5 rows), row 12 = bottom coastline
  const topIslandStartRow = 0;
  const topIslandBottomRow = Math.floor(height * 0.31); // row 4 for h=13
  const waterStartRow = topIslandBottomRow + 1;
  const bottomIslandTopRow = Math.floor(height * 0.62); // row 8 for h=13
  const bottomIslandBottomRow = height - 1;

  const cells: SceneCell[][] = [];

  for (let row = 0; row < height; row++) {
    const rowCells: SceneCell[] = [];

    // Determine which "zone" this row is in
    const isTopIslandTopEdge = row === topIslandStartRow;
    const isTopIslandBottomCoastline = row === topIslandBottomRow;
    const isTopIslandInterior =
      row > topIslandStartRow && row < topIslandBottomRow;
    const isWaterRow = row >= waterStartRow && row < bottomIslandTopRow;
    const isBottomIslandTopEdge = row === bottomIslandTopRow;
    const isBottomIslandBottomCoastline = row === bottomIslandBottomRow;
    const isBottomIslandInterior =
      row > bottomIslandTopRow && row < bottomIslandBottomRow;

    for (let col = 0; col < width; col++) {
      let tile: WaveAnimatedTile;
      let isWater = false;

      if (isWaterRow) {
        // Pure water, no tile — the renderer will draw the background color
        tile = TILE_GRASS_CENTER; // placeholder, won't be rendered
        isWater = true;
      } else if (isTopIslandTopEdge || isBottomIslandTopEdge) {
        // Top edge of an island
        if (col === 0) tile = TILE_GRASS_TOP_LEFT;
        else if (col === width - 1) tile = TILE_GRASS_TOP_RIGHT;
        else tile = TILE_GRASS_TOP_MID;
      } else if (
        isTopIslandBottomCoastline ||
        isBottomIslandBottomCoastline
      ) {
        // Bottom edge of an island (water-animated)
        if (col === 0) tile = TILE_WATER_BOTTOM_LEFT;
        else if (col === width - 1) tile = TILE_WATER_BOTTOM_RIGHT;
        else tile = TILE_WATER_BOTTOM_MID;
      } else if (isTopIslandInterior || isBottomIslandInterior) {
        // Interior of an island
        if (col === 0) tile = TILE_GRASS_LEFT_MID;
        else if (col === width - 1) tile = TILE_GRASS_RIGHT_MID;
        else {
          // Center cell — chance of grass detail
          if (rng() < detailDensity) {
            const detail =
              GRASS_DETAIL_TILES[Math.floor(rng() * GRASS_DETAIL_TILES.length)]!;
            tile = { frame0: detail, frame1: detail };
          } else {
            tile = TILE_GRASS_CENTER;
          }
        }
      } else {
        // Shouldn't happen, but fall back to plain center
        tile = TILE_GRASS_CENTER;
      }

      rowCells.push({ tile, isWater });
    }

    cells.push(rowCells);
  }

  return {
    width,
    height,
    cells,
    seed,
  };
}
```

---

## Step 3 — Create `components/SceneRenderer.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import {
  TILE_SIZE,
  TILESET_PATH,
  ATLAS_COLS,
  ATLAS_ROWS,
  WATER_BACKGROUND_COLOR,
} from "@/lib/scene/tileset";
import type { Scene } from "@/lib/scene/types";

const WAVE_INTERVAL_MS = 300;

type SceneRendererProps = {
  scene: Scene;
  /** Visual scale factor. Default chosen responsively if not provided. */
  scale?: number;
};

export function SceneRenderer({ scene, scale: scaleProp }: SceneRendererProps) {
  const [waveFrame, setWaveFrame] = useState<0 | 1>(0);
  const [computedScale, setComputedScale] = useState<number>(scaleProp ?? 2);

  // Global wave animation tick — toggles every 300ms
  useEffect(() => {
    const interval = setInterval(() => {
      setWaveFrame((f) => (f === 0 ? 1 : 0));
    }, WAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Responsive scale: pick the largest integer scale that fits the viewport
  useEffect(() => {
    if (scaleProp !== undefined) {
      setComputedScale(scaleProp);
      return;
    }

    function recompute() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const maxScaleByW = Math.floor(vw / (scene.width * TILE_SIZE));
      const maxScaleByH = Math.floor(vh / (scene.height * TILE_SIZE));
      const scale = Math.max(2, Math.min(maxScaleByW, maxScaleByH, 5));
      setComputedScale(scale);
    }

    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [scaleProp, scene.width, scene.height]);

  const tilePx = TILE_SIZE * computedScale;
  const sceneWidthPx = scene.width * tilePx;
  const sceneHeightPx = scene.height * tilePx;
  const atlasWidthPx = ATLAS_COLS * tilePx;
  const atlasHeightPx = ATLAS_ROWS * tilePx;

  return (
    <div
      style={{
        width: sceneWidthPx,
        height: sceneHeightPx,
        backgroundColor: WATER_BACKGROUND_COLOR,
        position: "relative",
        imageRendering: "pixelated",
      }}
    >
      {scene.cells.map((row, rowIdx) =>
        row.map((cell, colIdx) => {
          if (cell.isWater) return null; // water cells stay transparent

          const coord = waveFrame === 0 ? cell.tile.frame0 : cell.tile.frame1;
          return (
            <div
              key={`${rowIdx}-${colIdx}`}
              style={{
                position: "absolute",
                left: colIdx * tilePx,
                top: rowIdx * tilePx,
                width: tilePx,
                height: tilePx,
                backgroundImage: `url(${TILESET_PATH})`,
                backgroundPosition: `-${coord.col * tilePx}px -${coord.row * tilePx}px`,
                backgroundSize: `${atlasWidthPx}px ${atlasHeightPx}px`,
                backgroundRepeat: "no-repeat",
                imageRendering: "pixelated",
              }}
            />
          );
        }),
      )}
    </div>
  );
}
```

### Important rendering notes
- The water cells are skipped (`return null`) — the parent `<div>` has the water background color, so the gaps reveal it. This is the trick: water is not a tile, it's negative space.
- All wave-animated tiles synchronize via the shared `waveFrame` state — they swap frames at the same 300ms tick.
- `imageRendering: pixelated` is set on both parent and children to prevent any browser-level blurring.

---

## Step 4 — Create dev page `app/dev/scene/page.tsx`

```tsx
"use client";

import { useState } from "react";
import { generateScene } from "@/lib/scene/generator";
import { SceneRenderer } from "@/components/SceneRenderer";

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

export default function SceneDevPage() {
  const [seed, setSeed] = useState("default");
  const [width, setWidth] = useState(8);
  const [height, setHeight] = useState(13);
  const [scale, setScale] = useState<number | undefined>(undefined);

  const scene = generateScene(seed, { width, height });

  return (
    <main className="min-h-screen bg-slate-900 text-white p-6 flex flex-col items-center gap-6">
      <h1 className="text-2xl font-bold">Scene generator dev page</h1>

      <div className="flex flex-wrap gap-3 items-center text-sm">
        <label className="flex items-center gap-2">
          Seed:
          <input
            type="text"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            className="bg-slate-800 px-2 py-1 rounded font-mono"
          />
        </label>
        <button
          onClick={() => setSeed(randomSeed())}
          className="bg-emerald-700 hover:bg-emerald-600 px-3 py-1 rounded font-semibold"
        >
          Random seed
        </button>
        <label className="flex items-center gap-2">
          Width:
          <input
            type="number"
            value={width}
            min={4}
            max={20}
            onChange={(e) => setWidth(parseInt(e.target.value) || 8)}
            className="bg-slate-800 px-2 py-1 rounded w-16"
          />
        </label>
        <label className="flex items-center gap-2">
          Height:
          <input
            type="number"
            value={height}
            min={6}
            max={30}
            onChange={(e) => setHeight(parseInt(e.target.value) || 13)}
            className="bg-slate-800 px-2 py-1 rounded w-16"
          />
        </label>
        <label className="flex items-center gap-2">
          Scale (override):
          <select
            value={scale ?? "auto"}
            onChange={(e) =>
              setScale(e.target.value === "auto" ? undefined : parseInt(e.target.value))
            }
            className="bg-slate-800 px-2 py-1 rounded"
          >
            <option value="auto">auto</option>
            <option value="2">2x</option>
            <option value="3">3x</option>
            <option value="4">4x</option>
            <option value="5">5x</option>
          </select>
        </label>
      </div>

      <div className="flex justify-center">
        <SceneRenderer scene={scene} scale={scale} />
      </div>

      <div className="text-xs text-slate-400 max-w-md text-center font-mono">
        <p>Seed: {seed}</p>
        <p>Dimensions: {width} × {height} tiles</p>
        <p className="mt-2 text-slate-500">
          Coastline tiles should animate every 300ms (subtle wave effect).
        </p>
      </div>
    </main>
  );
}
```

---

## Step 5 — Verify

After implementation, run:

```bash
npm run lint
npm run build
npm run test:run
```

All must pass. Then visit `http://localhost:3000/dev/scene` and verify:

### Visual test plan
1. **Default scene loads:** see top island, water gap, bottom island.
2. **Wave animation works:** the bottom-coastline tiles of both islands subtly swap between two frames every 300ms. The animation should be **perfectly synchronized** across all wave-animated tiles.
3. **Pixels are crisp:** no blurry tiles when scaled up.
4. **Different seeds produce different scenes:** click "Random seed" repeatedly — grass detail placement should change, but island structure stays the same (no variation in island shape yet, that's a future task).
5. **Same seed produces same scene:** type a seed, change something, type it back — same scene appears.
6. **Responsive scaling works:** resize the browser window — scale auto-adjusts. Set scale override to 4x and confirm it forces that scale regardless of window size.
7. **Edge tiles are correct:**
   - Top-left of top island: `GRASS_TILE_TOP_LEFT`
   - Bottom-right of bottom island: water-animated `GRASS_WATER0/1_BOTTOM_RIGHT`
   - Interior: mix of `GRASS_TILE_CENTER` and random detail tiles

---

## Acceptance criteria
- [ ] `lib/scene/types.ts`, `lib/scene/generator.ts`, `components/SceneRenderer.tsx`, `app/dev/scene/page.tsx` all exist with the specified APIs.
- [ ] `npm run lint` clean.
- [ ] `npm run build` succeeds.
- [ ] `npm run test:run` green (all existing tests still pass).
- [ ] Dev page at `/dev/scene` renders correctly per visual test plan above.
- [ ] No hardcoded scale assumptions — `SceneRenderer` adapts to viewport.
- [ ] Wave animation runs at 300ms ticks, all tiles synchronized.
- [ ] `WATER_BACKGROUND_COLOR` in tileset uses `#43A38D` (user-confirmed). Update the tileset file if it currently has a different value or is missing the leading `#`.

---

## Non-goals
- ❌ No piers — separate future task.
- ❌ No characters in the scene — they live in the game UI, separate from this renderer.
- ❌ No irregular coastlines / inner corners — needs atlas rows 4-7 which aren't mapped yet.
- ❌ No integration into the actual game (`GameView`) — that's a future task once we're happy with the scene visuals.
- ❌ No card or hand rendering on the scene.
- ❌ No sound.
- ❌ Don't modify existing files except `lib/scene/tileset.ts` (only to fix the `WATER_BACKGROUND_COLOR` if needed).

---

## Wrap-up
- Suggested commit: `feat: procedural scene generator with wave animation and dev page`
- Brief response back: files created, build/test status, anything unexpected during implementation.
