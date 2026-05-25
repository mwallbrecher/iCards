# Codex Prompt — Fix Coastline Generator

> The previous coastline generator has multiple bugs. This prompt rewrites the algorithm with clearer logic and an enforced "max 1-row step" constraint that matches the available tile set.

---

## Task: Rewrite `lib/scene/generator.ts` to fix coastline rendering bugs

### Bugs being fixed
1. Floating bottom-coastline tiles appearing in the middle of inland (not at the actual water boundary).
2. Corner tiles placed at non-corner positions, or missing at actual step positions.
3. Coastline jumps larger than 1 row, which cannot be rendered cleanly with available corner tiles.
4. Inland of the viewer's island sometimes had random coastline tiles too.

### Root cause
The original code mixed two independent variation phases (wiggle ±1 and peninsula +2) without enforcing the constraint that the coastline can only change by 1 row between adjacent columns. The available tile set only supports 1-row steps. Larger steps result in undefined rendering.

The fix: enforce "max 1-row step" as a hard constraint during coastline generation. Then render each cell based on the coastline array, with a clean separation between "is this cell water / coastline / inland / corner".

---

## Complete replacement for `lib/scene/generator.ts`

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
} from "./tileset";
import type { Scene, SceneCell, GenerateSceneOptions } from "./types";

// --- PRNG helpers ---

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

// --- Wave-animated corner tiles for opponent island ---

const TILE_WATER_CORNER_BOTTOM_LEFT: WaveAnimatedTile = {
  frame0: GRASS_WATER0_CORNER_BOTTOM_LEFT,
  frame1: GRASS_WATER1_CORNER_BOTTOM_LEFT,
};

const TILE_WATER_CORNER_BOTTOM_RIGHT: WaveAnimatedTile = {
  frame0: GRASS_WATER0_CORNER_BOTTOM_RIGHT,
  frame1: GRASS_WATER1_CORNER_BOTTOM_RIGHT,
};

// ============================================================
// COASTLINE GENERATION
// ============================================================

/**
 * Generates a coastline array where every adjacent pair differs by AT MOST 1.
 *
 * Algorithm:
 *   1. Start with all values = baseRow.
 *   2. Optionally place ONE peninsula: pick a start column and width (2-3),
 *      set those columns to baseRow ± 1.
 *   3. Apply per-column random wiggle of ±1, but ONLY if the wiggle keeps
 *      the "max 1-row step" constraint between adjacent columns.
 *
 * The result is guaranteed to have no jumps larger than 1.
 *
 * @param direction "down" for opponent island (peninsulas extend toward higher row indices),
 *                  "up" for viewer island (peninsulas extend toward lower row indices)
 */
function generateCoastline(
  rng: () => number,
  width: number,
  baseRow: number,
  direction: "down" | "up",
): number[] {
  const sign = direction === "down" ? 1 : -1;
  const coastline: number[] = new Array(width).fill(baseRow);

  // Step 1: Maybe place ONE peninsula (2-3 columns wide, 1 deeper than base)
  const placePeninsula = rng() < 0.6;
  if (placePeninsula && width >= 5) {
    const peninsulaWidth = 2 + Math.floor(rng() * 2); // 2 or 3
    const maxStart = width - peninsulaWidth;
    const minStart = 1;
    const peninsulaStart =
      minStart + Math.floor(rng() * (maxStart - minStart + 1));
    const peninsulaDepth = baseRow + sign;
    for (let c = peninsulaStart; c < peninsulaStart + peninsulaWidth; c++) {
      coastline[c] = peninsulaDepth;
    }
  }

  // Step 2: Per-column wiggle, enforcing "max 1-row step" constraint
  // We walk through columns and propose ±1 changes; we only accept them
  // if they don't create an illegal jump with either neighbor.
  for (let col = 0; col < width; col++) {
    if (rng() > 0.2) continue; // 80% of cells stay as-is

    const proposedDelta = rng() < 0.5 ? 1 : -1;
    const proposedRow = coastline[col]! + proposedDelta;

    // Check left neighbor
    if (col > 0 && Math.abs(proposedRow - coastline[col - 1]!) > 1) continue;
    // Check right neighbor
    if (col < width - 1 && Math.abs(proposedRow - coastline[col + 1]!) > 1) continue;

    coastline[col] = proposedRow;
  }

  return coastline;
}

// ============================================================
// TILE PICKING — given the coastline, decide tile per cell
// ============================================================

/**
 * For the opponent's island (top of scene), decides the tile at (col, row).
 *
 * Layout perspective: the island fills the TOP of the scene. The water-facing
 * edge is at the BOTTOM. `coastline[col]` gives the row index of the last
 * island cell (the cell that shows BOTTOM_MID).
 *
 * Cells above coastline[col]: inland (CENTER or grass detail).
 * Cell at coastline[col]: bottom edge. Either BOTTOM_MID or a corner tile
 *   if there's a step to the left/right.
 * Cells below coastline[col]: water (null).
 */
function tileForOpponentIsland(
  detailRng: () => number,
  col: number,
  row: number,
  coastline: number[],
  detailDensity: number,
): SceneCell {
  const myCoast = coastline[col]!;
  const leftCoast = col > 0 ? coastline[col - 1]! : myCoast;
  const rightCoast =
    col < coastline.length - 1 ? coastline[col + 1]! : myCoast;

  // Water (below my coastline)
  if (row > myCoast) {
    return { tile: null };
  }

  // The bottom-edge row for this column
  if (row === myCoast) {
    // Corner case: my left neighbor is HIGHER than me (smaller row).
    // That means: to my left there's water at this row. I'm the leftmost
    // island cell of a stretch that goes further down than my left neighbor.
    // → Use bottom-left corner tile (water comes around my left side).
    if (leftCoast < myCoast) {
      return { tile: TILE_WATER_CORNER_BOTTOM_LEFT };
    }
    // Symmetric for right
    if (rightCoast < myCoast) {
      return { tile: TILE_WATER_CORNER_BOTTOM_RIGHT };
    }
    // Otherwise plain bottom-mid
    return { tile: TILE_GRASS_BOTTOM_MID };
  }

  // Inland (above coastline)
  if (detailRng() < detailDensity) {
    const detail =
      GRASS_DETAIL_TILES[Math.floor(detailRng() * GRASS_DETAIL_TILES.length)]!;
    return { tile: { frame0: detail, frame1: detail } };
  }
  return { tile: TILE_GRASS_CENTER };
}

/**
 * For the viewer's island (bottom of scene), decides the tile at (col, row).
 *
 * Layout perspective: the island fills the BOTTOM of the scene. The water-facing
 * edge is at the TOP. `coastline[col]` gives the row index of the first island
 * cell (the cell that shows TOP_MID).
 *
 * Cells above coastline[col]: water (null).
 * Cell at coastline[col]: top edge. Either TOP_MID or a corner tile.
 * Cells below coastline[col]: inland (CENTER or grass detail).
 */
function tileForViewerIsland(
  detailRng: () => number,
  col: number,
  row: number,
  coastline: number[],
  detailDensity: number,
): SceneCell {
  const myCoast = coastline[col]!;
  const leftCoast = col > 0 ? coastline[col - 1]! : myCoast;
  const rightCoast =
    col < coastline.length - 1 ? coastline[col + 1]! : myCoast;

  // Water (above my coastline)
  if (row < myCoast) {
    return { tile: null };
  }

  // The top-edge row for this column
  if (row === myCoast) {
    // Corner case: my left neighbor is LOWER than me (higher row index).
    // That means: to my left there's water at this row. I'm the leftmost
    // island cell of a stretch that goes further up than my left neighbor.
    // → Use top-left corner tile.
    if (leftCoast > myCoast) {
      return { tile: TILE_GRASS_CORNER_TOP_LEFT };
    }
    if (rightCoast > myCoast) {
      return { tile: TILE_GRASS_CORNER_TOP_RIGHT };
    }
    return { tile: TILE_GRASS_TOP_MID };
  }

  // Inland (below coastline)
  if (detailRng() < detailDensity) {
    const detail =
      GRASS_DETAIL_TILES[Math.floor(detailRng() * GRASS_DETAIL_TILES.length)]!;
    return { tile: { frame0: detail, frame1: detail } };
  }
  return { tile: TILE_GRASS_CENTER };
}

// ============================================================
// MAIN ENTRY
// ============================================================

export function generateScene(
  seed: string,
  opts: GenerateSceneOptions = {},
): Scene {
  const width = opts.width ?? 8;
  const height = opts.height ?? 13;
  const detailDensity = opts.detailDensity ?? 0.2;

  const topRng = mulberry32(hashSeed(seed + ":top"));
  const bottomRng = mulberry32(hashSeed(seed + ":bottom"));
  const detailRngTop = mulberry32(hashSeed(seed + ":detail-top"));
  const detailRngBottom = mulberry32(hashSeed(seed + ":detail-bottom"));

  // Base rows: opponent island ends around row 4 (of 13), viewer starts around row 8
  const topBaseRow = Math.floor(height * 0.31);
  const bottomBaseRow = Math.floor(height * 0.62);

  const topCoastline = generateCoastline(topRng, width, topBaseRow, "down");
  const bottomCoastline = generateCoastline(
    bottomRng,
    width,
    bottomBaseRow,
    "up",
  );

  // Safety: ensure at least 1 row of water between islands per column.
  // (Should never trigger with current peninsula depth of ±1 and base distance,
  // but defensive code is cheap.)
  for (let col = 0; col < width; col++) {
    while (topCoastline[col]! + 2 > bottomCoastline[col]!) {
      // Pull bottom coastline down by 1, but respect max-1-step constraint
      // by also pulling neighbors if needed.
      bottomCoastline[col]! += 1;
      if (
        col > 0 &&
        Math.abs(bottomCoastline[col]! - bottomCoastline[col - 1]!) > 1
      ) {
        bottomCoastline[col - 1]! = bottomCoastline[col]! - 1;
      }
      if (
        col < width - 1 &&
        Math.abs(bottomCoastline[col]! - bottomCoastline[col + 1]!) > 1
      ) {
        bottomCoastline[col + 1]! = bottomCoastline[col]! - 1;
      }
    }
  }

  // Build the grid
  const cells: SceneCell[][] = [];
  for (let row = 0; row < height; row++) {
    const rowCells: SceneCell[] = [];
    for (let col = 0; col < width; col++) {
      const topCoast = topCoastline[col]!;
      const bottomCoast = bottomCoastline[col]!;

      let cell: SceneCell;
      if (row <= topCoast) {
        cell = tileForOpponentIsland(
          detailRngTop,
          col,
          row,
          topCoastline,
          detailDensity,
        );
      } else if (row >= bottomCoast) {
        cell = tileForViewerIsland(
          detailRngBottom,
          col,
          row,
          bottomCoastline,
          detailDensity,
        );
      } else {
        cell = { tile: null }; // water in the middle
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

## What changed compared to the previous version

1. **Corner detection is now on the coastline row itself**, not the row above. The corner tile sits AT the same row as the coastline step. This is the visually correct placement.

2. **"Max 1-row step" is enforced**: the coastline generator never produces jumps larger than 1 between adjacent columns. Both the peninsula step and the wiggle step respect this.

3. **Inland rows never use BOTTOM_MID or TOP_MID**: only the cell at `row === coastline[col]` can be an edge tile. Everything above (opponent) or below (viewer) the coastline is plain `CENTER` or a grass detail. This kills the "floating coastline tiles in the middle of inland" bug.

4. **Detail RNG is separate from coastline RNG**: this way, changing the coastline algorithm doesn't shift the detail placement, and vice versa. Easier debugging.

5. **Defensive clamp** for the rare case where peninsulas could make the islands touch.

---

## Acceptance criteria

- [ ] No more floating coastline tiles in the middle of an island.
- [ ] Corner tiles only appear adjacent to a 1-row step in the coastline.
- [ ] Peninsulas have clear 2-3 column wide protrusions, 1 row deeper than surrounding coastline.
- [ ] The mild wiggle (±1) shows up subtly between peninsulas.
- [ ] Test plan: click "Random seed" 10+ times; every result should look coherent — every step has the right corner tile, no random tiles in inland.
- [ ] `npm run lint` clean.
- [ ] `npm run build` succeeds.
- [ ] `npm run test:run` green.

---

## Non-goals

- ❌ No new tile types.
- ❌ No changes to `types.ts` or `SceneRenderer.tsx` — only `generator.ts`.
- ❌ No additional features (piers, characters, etc.) — purely fixing coastline rendering.

---

## Wrap-up

- Suggested commit: `fix: enforce 1-row-step constraint in coastline generator`
- Brief response back: include 2-3 sample seeds that produce nice variations.
