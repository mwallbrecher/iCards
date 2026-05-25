# Codex Prompt — Variable Coastline Generator

> Copy this entire prompt into a fresh Codex chat in VS Code. It upgrades the existing scene generator so each island's water-facing edge has seed-based variation (peninsulas and inlets), while the rest of the island runs off-screen.

---

## Task: Add seed-based variation to the water-facing coastline of each island, with peninsulas and inlets. The island extends beyond the visible screen on all non-water sides.

### Context
The current scene generator (Day 7, `lib/scene/generator.ts`) draws two rectangular islands with straight coastlines. We're now upgrading it to produce variable coastlines per seed — peninsulas (Land protrudes into the water) and inlets (water protrudes into the land) — independently for each island.

### Critical architectural insight: 2.5D perspective

The game uses a Stardew-Valley-style 2.5D perspective. This means the two islands are drawn from **different angles**:

- **Opponent's island (top of screen):** Viewed from the front. Its water-facing edge is the BOTTOM. Has visible rocky surf with wave animation.
- **Viewer's own island (bottom of screen):** Viewed from above/behind. Its water-facing edge is the TOP. Has NO surf — just a flat dark outline transitioning to grass.

This asymmetry has direct consequences for which tiles are used:

- Opponent's island bottom-coastline uses **wave-animated tiles** (`GRASS_WATER0/1_BOTTOM_*`).
- Viewer's island top-coastline uses **plain top-edge tiles** (`GRASS_TILE_TOP_*`) — no water variant exists because there's no rocky surf in this perspective.
- Opponent's island uses `CORNER_BOTTOM_LEFT/RIGHT` (water-animated) for peninsulas/inlets.
- Viewer's island uses `CORNER_TOP_LEFT/RIGHT` (static, no wave) for peninsulas/inlets.

### Island extends beyond visible screen

Both islands extend beyond the visible scene on their non-water sides. This means:

- **No left, right, or far-edge tiles are visible.** No `LEFT_MID`, `RIGHT_MID`, `TOP_LEFT`, `TOP_RIGHT`, `BOTTOM_LEFT`, `BOTTOM_RIGHT` are used.
- The entire visible scene shows interior + water-facing coastline only.
- The opponent's island fills rows 0 through its bottom-coastline. Above the bottom-coastline: all `CENTER` tiles (plus details).
- The viewer's island fills rows from its top-coastline down to the bottom of the scene. Below the top-coastline: all `CENTER` tiles (plus details).
- The water-facing edge of each island varies per seed (the main change in this task).

### Variation level: moderate

- Each `col` has a "coastline row" — the row where land meets water for that column.
- Coastline can wiggle ±1 row from the base coastline.
- 0-1 peninsula per island, where a 2-3 tile-wide section juts 1 row deeper into the water.
- Both islands vary independently using sub-seeds (`seed + ":top"` and `seed + ":bottom"`).
- Generator is fully deterministic — same seed produces same scene.

---

## Step 1 — Update `lib/scene/types.ts`

Extend the existing types to support per-column coastline:

```typescript
import type { WaveAnimatedTile } from "./tileset";

export type SceneCell = {
  /** The tile to render at this position. null = pure water (transparent, water bg shows through) */
  tile: WaveAnimatedTile | null;
};

export type Scene = {
  width: number;   // columns
  height: number;  // rows
  cells: SceneCell[][];  // [row][col]
  /** Per-column row index where opponent's island ends (BOTTOM coastline of top island). */
  topIslandCoastline: number[];
  /** Per-column row index where viewer's island begins (TOP coastline of bottom island). */
  bottomIslandCoastline: number[];
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

Notes:
- `tile: WaveAnimatedTile | null` — null means water at that cell (was previously `isWater: true`, simplified).
- The two coastline arrays let the caller (e.g. future pier placement) know where the water edge is per column.

---

## Step 2 — Rewrite `lib/scene/generator.ts`

```typescript
import {
  TILE_GRASS_TOP_MID,
  TILE_GRASS_CENTER,
  TILE_GRASS_BOTTOM_MID,
  TILE_GRASS_CORNER_TOP_LEFT,
  TILE_GRASS_CORNER_TOP_RIGHT,
  GRASS_DETAIL_TILES,
  GRASS_WATER0_CORNER_BOTTOM_LEFT,
  GRASS_WATER0_CORNER_BOTTOM_RIGHT,
  GRASS_WATER1_CORNER_BOTTOM_LEFT,
  GRASS_WATER1_CORNER_BOTTOM_RIGHT,
  type WaveAnimatedTile,
  type TileCoord,
} from "./tileset";
import type { Scene, SceneCell, GenerateSceneOptions } from "./types";

// --- PRNG helpers (deterministic) ---

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

function hashSeed(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// --- Wave-animated tile helpers for opponent island corners ---

const TILE_WATER_CORNER_BOTTOM_LEFT_WAVE: WaveAnimatedTile = {
  frame0: GRASS_WATER0_CORNER_BOTTOM_LEFT,
  frame1: GRASS_WATER1_CORNER_BOTTOM_LEFT,
};

const TILE_WATER_CORNER_BOTTOM_RIGHT_WAVE: WaveAnimatedTile = {
  frame0: GRASS_WATER0_CORNER_BOTTOM_RIGHT,
  frame1: GRASS_WATER1_CORNER_BOTTOM_RIGHT,
};

// --- Coastline generation per island ---

/**
 * Generates a per-column coastline array.
 *
 * baseRow: the "average" row where this island's water edge sits.
 * direction: "down" for opponent's island (peninsulas jut down into water),
 *            "up" for viewer's island (peninsulas jut up into water).
 *            (Visually we just shift rows by +1 or -1 respectively.)
 *
 * Returns: array of length `width`, where each value is the row index of
 * the coastline for that column.
 */
function generateCoastline(
  rng: () => number,
  width: number,
  baseRow: number,
  direction: "down" | "up",
): number[] {
  const coastline: number[] = new Array(width).fill(baseRow);
  const sign = direction === "down" ? 1 : -1; // peninsulas move in this direction

  // Step 1: Mild wiggle — each column independently nudged by 0 or ±1
  for (let col = 0; col < width; col++) {
    const roll = rng();
    if (roll < 0.15) {
      coastline[col] = baseRow + sign; // protrude
    } else if (roll < 0.25) {
      coastline[col] = baseRow - sign; // recede
    }
    // else stays at baseRow
  }

  // Step 2: 0-1 wider peninsula (2-3 tiles wide, protrudes 1 deeper)
  if (rng() < 0.65 && width >= 5) {
    const peninsulaWidth = 2 + Math.floor(rng() * 2); // 2 or 3 tiles
    const maxStart = width - peninsulaWidth - 1;
    const peninsulaStart = 1 + Math.floor(rng() * Math.max(1, maxStart - 1));
    const peninsulaDepth = baseRow + sign * 2; // 1 row deeper than wiggle max

    for (let c = peninsulaStart; c < peninsulaStart + peninsulaWidth; c++) {
      coastline[c] = peninsulaDepth;
    }
  }

  return coastline;
}

// --- Cell-by-cell tile decision ---

/**
 * Pick a static or wave-animated tile for the opponent's island, given
 * the column and the coastline row at that column.
 */
function tileForOpponentIsland(
  rng: () => number,
  col: number,
  row: number,
  coastline: number[],
  detailDensity: number,
): SceneCell {
  const myCoast = coastline[col]!;

  // Below my island? Then this cell is water.
  if (row > myCoast) {
    return { tile: null };
  }

  // Am I on the coastline row for this column?
  if (row === myCoast) {
    // Check neighbors to decide if this is an inner-corner tile or plain BOTTOM_MID.
    const leftCoast = col > 0 ? coastline[col - 1]! : myCoast;
    const rightCoast = col < coastline.length - 1 ? coastline[col + 1]! : myCoast;

    // The cell at (col, myCoast) is rendered as BOTTOM_MID UNLESS we need
    // a corner because of a step in the coastline.
    //
    // Inner corner logic for opponent's island (water-side = bottom):
    //   If left neighbor's coastline is HIGHER (smaller row index = closer to top),
    //   then the cell at (col-1, myCoast) was water, and we're standing at the
    //   bottom-left tile of a peninsula step.
    //
    // For simplicity at the wiggle level: just place BOTTOM_MID for the coastline
    // cells. Corner-tile decisions happen at the ROW ABOVE (see below).
    return { tile: TILE_GRASS_BOTTOM_MID };
  }

  // Above the coastline: interior land of the opponent's island.
  //
  // Check if this cell is at a "corner position" — the row right above the coastline,
  // where the left or right neighbor's coastline is one row LOWER (meaning a peninsula
  // step starts here).
  if (row === myCoast - 1) {
    const leftCoast = col > 0 ? coastline[col - 1]! : myCoast;
    const rightCoast = col < coastline.length - 1 ? coastline[col + 1]! : myCoast;

    // Right neighbor's coastline is deeper (larger row) → there's a "step down" to the right.
    // The cell on the right at row (myCoast) is water; we need a corner here.
    if (rightCoast > myCoast) {
      return { tile: TILE_WATER_CORNER_BOTTOM_LEFT_WAVE };
    }
    if (leftCoast > myCoast) {
      return { tile: TILE_WATER_CORNER_BOTTOM_RIGHT_WAVE };
    }
  }

  // Otherwise: plain interior land cell. Maybe a grass detail.
  if (rng() < detailDensity) {
    const detail = GRASS_DETAIL_TILES[Math.floor(rng() * GRASS_DETAIL_TILES.length)]!;
    return { tile: { frame0: detail, frame1: detail } };
  }
  return { tile: TILE_GRASS_CENTER };
}

/**
 * Pick a static tile for the viewer's island, given the column and the coastline row.
 * No wave animation here — viewer's island has no surf in 2.5D perspective.
 */
function tileForViewerIsland(
  rng: () => number,
  col: number,
  row: number,
  coastline: number[],
  detailDensity: number,
): SceneCell {
  const myCoast = coastline[col]!;

  // Above my coastline? Water.
  if (row < myCoast) {
    return { tile: null };
  }

  // Am I on the coastline row?
  if (row === myCoast) {
    return { tile: TILE_GRASS_TOP_MID };
  }

  // Below coastline: interior land. Check if I'm at a corner position —
  // the row right below the coastline, where peninsulas create steps.
  if (row === myCoast + 1) {
    const leftCoast = col > 0 ? coastline[col - 1]! : myCoast;
    const rightCoast = col < coastline.length - 1 ? coastline[col + 1]! : myCoast;

    // Right neighbor's coastline is HIGHER (smaller row) — there's a peninsula step
    // going up to the right; the cell to the right at row myCoast is water; we need
    // a corner here.
    if (rightCoast < myCoast) {
      return { tile: TILE_GRASS_CORNER_TOP_LEFT };
    }
    if (leftCoast < myCoast) {
      return { tile: TILE_GRASS_CORNER_TOP_RIGHT };
    }
  }

  // Plain interior cell. Maybe a detail.
  if (rng() < detailDensity) {
    const detail = GRASS_DETAIL_TILES[Math.floor(rng() * GRASS_DETAIL_TILES.length)]!;
    return { tile: { frame0: detail, frame1: detail } };
  }
  return { tile: TILE_GRASS_CENTER };
}

// --- Main entry ---

export function generateScene(
  seed: string,
  opts: GenerateSceneOptions = {},
): Scene {
  const width = opts.width ?? 8;
  const height = opts.height ?? 13;
  const detailDensity = opts.detailDensity ?? 0.2;

  // Use sub-seeds so both islands vary independently but deterministically.
  const topRng = mulberry32(hashSeed(seed + ":top"));
  const bottomRng = mulberry32(hashSeed(seed + ":bottom"));
  const detailRngTop = mulberry32(hashSeed(seed + ":detail-top"));
  const detailRngBottom = mulberry32(hashSeed(seed + ":detail-bottom"));

  // Base coastline rows: top island ends around 31% down, bottom island starts around 62% down.
  const topBaseRow = Math.floor(height * 0.31);
  const bottomBaseRow = Math.floor(height * 0.62);

  const topCoastline = generateCoastline(topRng, width, topBaseRow, "down");
  const bottomCoastline = generateCoastline(bottomRng, width, bottomBaseRow, "up");

  // Sanity: ensure there's always at least 1 row of pure water between islands.
  // If a peninsula pushes too far down and another pushes too far up, they could touch.
  // Clamp so that for every column: topCoastline[col] + 2 <= bottomCoastline[col].
  for (let col = 0; col < width; col++) {
    if (topCoastline[col]! + 2 > bottomCoastline[col]!) {
      // Pull bottom coastline down a row to maintain gap
      bottomCoastline[col] = topCoastline[col]! + 2;
    }
  }

  // Build the cell grid.
  const cells: SceneCell[][] = [];
  for (let row = 0; row < height; row++) {
    const rowCells: SceneCell[] = [];
    for (let col = 0; col < width; col++) {
      const topCoast = topCoastline[col]!;
      const bottomCoast = bottomCoastline[col]!;

      let cell: SceneCell;
      if (row <= topCoast) {
        cell = tileForOpponentIsland(detailRngTop, col, row, topCoastline, detailDensity);
      } else if (row >= bottomCoast) {
        cell = tileForViewerIsland(detailRngBottom, col, row, bottomCoastline, detailDensity);
      } else {
        // Pure water row between the islands
        cell = { tile: null };
      }
      rowCells.push(cell);
    }
    cells.push(rowCells);
  }

  return {
    width,
    height,
    cells,
    topIslandCoastline: topCoastline,
    bottomIslandCoastline: bottomCoastline,
    seed,
  };
}
```

---

## Step 3 — Update `components/SceneRenderer.tsx`

The renderer needs a small change: instead of checking `cell.isWater`, it now checks `cell.tile === null`. That's the only required change. Otherwise it keeps working exactly as before (wave animation, responsive scaling, etc.).

Find the rendering loop in `SceneRenderer.tsx` and change:

```tsx
// OLD:
if (cell.isWater) return null;
const coord = waveFrame === 0 ? cell.tile.frame0 : cell.tile.frame1;

// NEW:
if (cell.tile === null) return null;
const coord = waveFrame === 0 ? cell.tile.frame0 : cell.tile.frame1;
```

Nothing else changes in the renderer.

---

## Step 4 — Update the dev page

`app/dev/scene/page.tsx` should continue to work as-is. Nothing to change here. But if Codex wants to add a small annotation to make the variation more visible, it could display the two coastline arrays as debug text at the bottom:

```tsx
<div className="text-xs text-slate-500 font-mono mt-2">
  <p>Top coastline: [{scene.topIslandCoastline.join(", ")}]</p>
  <p>Bottom coastline: [{scene.bottomIslandCoastline.join(", ")}]</p>
</div>
```

Optional but useful for verifying variation.

---

## Step 5 — Verify

```bash
npm run lint
npm run build
npm run test:run
```

All must pass. Then visit `http://localhost:3000/dev/scene` and verify:

### Visual test plan
1. **Default scene renders correctly:** opponent's island top with wavy bottom-coastline, viewer's island bottom with flat top-coastline.
2. **Click "Random seed" 10+ times:** each seed should produce visibly different coastlines (different wiggle, sometimes peninsulas).
3. **Opponent's island peninsulas:** if a peninsula appears on the opponent's island, the corner tiles at the peninsula base should be wave-animated (subtle 300ms tick).
4. **Viewer's island peninsulas:** if a peninsula appears on the viewer's island, the corner tiles should be static (no wave animation).
5. **No gap between islands disappears:** even with peninsulas/inlets, there should always be at least 1 row of pure water between the two islands. They should never touch.
6. **No edge tiles visible:** never see `TOP_LEFT`, `TOP_RIGHT`, `LEFT_MID`, `RIGHT_MID`, `BOTTOM_LEFT`, `BOTTOM_RIGHT` — the islands extend off-screen on those sides.
7. **Determinism:** typing the same seed produces the same scene, every time.

---

## Acceptance criteria
- [ ] `lib/scene/types.ts` updated with new shape (`tile: WaveAnimatedTile | null`, plus coastline arrays in Scene).
- [ ] `lib/scene/generator.ts` rewritten with seed-based coastline variation.
- [ ] `components/SceneRenderer.tsx` updated for the new cell shape (one-line change).
- [ ] Old `isWater` field removed everywhere — no leftover references.
- [ ] `npm run lint` clean.
- [ ] `npm run build` succeeds.
- [ ] `npm run test:run` green.
- [ ] Visual test plan passes — confirmed by user.

---

## Non-goals
- ❌ No piers — separate future task.
- ❌ No inlets (water cutting INTO the island) for now — only peninsulas (land protruding INTO water). Inlets would require the OTHER pair of corner tiles which we don't have. Stick to peninsulas only.
- ❌ No diagonal coastlines — corner tiles always sit at single-row steps, never multi-row steps.
- ❌ No new asset additions.
- ❌ No changes outside the three files listed.

---

## Wrap-up
- Suggested commit: `feat: variable coastline with seed-based peninsulas per island`
- Brief response back: confirmation of test pass, sample seeds that produced interesting peninsulas, any visual oddities noticed.
