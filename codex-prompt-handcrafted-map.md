# Codex Prompt — Replace Procedural Generator with Handcrafted ASCII Map

> Copy this entire prompt into a fresh Codex chat in VS Code. Replaces the procedural scene generator with a simple ASCII-map-to-Scene parser. One default map is included; more can be added later.

---

## Task: Replace the procedural coastline generator with a handcrafted ASCII map parser

### Why
The procedural generator produces inconsistent coastlines that don't align well with the available 2.5D tile set. Hand-drawn maps are far more reliable, give full control over the layout, and can be tweaked visually. For now we ship with ONE map; the architecture supports adding more later.

### What changes
- `lib/scene/generator.ts` is rewritten to parse a multi-line string into a `Scene` object.
- A character-to-tile mapping is defined explicitly in the file.
- One default map is provided.
- `lib/scene/types.ts` stays compatible (no breaking changes to consumers).
- `components/SceneRenderer.tsx` does NOT change — it reads the same `Scene` shape as before.
- `app/dev/scene/page.tsx` keeps working, but the seed input becomes irrelevant for now (kept for forward compatibility; the active map is always the default).

### Character-to-tile mapping
The mapping must be readable and unambiguous. Use these characters:

| Char | Meaning                              | Tile constant                              |
|------|--------------------------------------|--------------------------------------------|
| `.`  | Water (transparent, water bg)        | `null`                                      |
| `C`  | Center (plain inland grass)          | `TILE_GRASS_CENTER`                         |
| `D`  | Center but always rolls a detail tile (random pick from `GRASS_DETAIL_TILES`, deterministic from position) | grass detail            |
| `B`  | Opponent island bottom coastline (wave-animated) | `TILE_GRASS_BOTTOM_MID`               |
| `T`  | Viewer island top coastline (static) | `TILE_GRASS_TOP_MID`                        |
| `J`  | Opponent island inner-corner bottom-LEFT (wave)  | `TILE_WATER_CORNER_BOTTOM_LEFT`     |
| `K`  | Opponent island inner-corner bottom-RIGHT (wave) | `TILE_WATER_CORNER_BOTTOM_RIGHT`    |
| `F`  | Viewer island inner-corner top-LEFT  | `TILE_GRASS_CORNER_TOP_LEFT`                |
| `G`  | Viewer island inner-corner top-RIGHT | `TILE_GRASS_CORNER_TOP_RIGHT`               |

Letters chosen to be visually distinct in monospace: `J`/`K` and `F`/`G` are adjacent on the keyboard so left/right mirroring is easy to remember.

The `D` character is a "force-detail" tile — for cases where you want a tile to definitely show a grass detail (instead of relying on random density). It picks deterministically from the detail pool based on (row, col) position, so the same map always renders the same details.

### Default map
Use this map as `DEFAULT_MAP`:

```
CCCCCCCCCCCC
CCCDCCCCDCCC
CCCCCCCCCCCC
CCCCCDCCCCCC
BBBBBBBBBBBB
............
............
............
TTTTTTTTTTTT
CCCCDCCCCCCC
CCCCCCCCCDCC
CCDCCCCCCCCC
CCCCCCCCCCCC
```

This is 12 columns × 13 rows. Plain rectangular islands, water gap of 3 rows, grass details sprinkled. Wider than the default 8-column setup so the islands clearly extend off-screen on phones.

---

## Step 1 — Update `lib/scene/types.ts`

The existing types stay the same. Only one optional addition: keep `seed` field but make it nullable since the parser doesn't use it.

```typescript
import type { WaveAnimatedTile } from "./tileset";

export type SceneCell = {
  tile: WaveAnimatedTile | null;
};

export type Scene = {
  width: number;
  height: number;
  cells: SceneCell[][];
  topIslandCoastline: number[];     // kept for future pier placement
  bottomIslandCoastline: number[];  // kept for future pier placement
  seed: string | null;              // null when scene comes from a handcrafted map
};

export type GenerateSceneOptions = {
  width?: number;
  height?: number;
  detailDensity?: number;
};
```

The `topIslandCoastline` and `bottomIslandCoastline` arrays are now derived from the parsed map: for each column, find the row index of the `B` tile (opponent's bottom coastline) and the `T` tile (viewer's top coastline). If a column has neither (rare edge case for very weird maps), use `-1` to signal "no coastline in this column".

---

## Step 2 — Rewrite `lib/scene/generator.ts`

Replace the entire file with:

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
import type { Scene, SceneCell } from "./types";

// --- Wave-animated corner tiles for opponent island ---

const TILE_WATER_CORNER_BOTTOM_LEFT: WaveAnimatedTile = {
  frame0: GRASS_WATER0_CORNER_BOTTOM_LEFT,
  frame1: GRASS_WATER1_CORNER_BOTTOM_LEFT,
};

const TILE_WATER_CORNER_BOTTOM_RIGHT: WaveAnimatedTile = {
  frame0: GRASS_WATER0_CORNER_BOTTOM_RIGHT,
  frame1: GRASS_WATER1_CORNER_BOTTOM_RIGHT,
};

// --- Default handcrafted map ---
// Characters:
//   .  water
//   C  center grass (inland)
//   D  center with forced grass detail
//   B  opponent bottom-coastline (wave)
//   T  viewer top-coastline (static)
//   J  opponent inner-corner bottom-LEFT (wave)
//   K  opponent inner-corner bottom-RIGHT (wave)
//   F  viewer inner-corner top-LEFT
//   G  viewer inner-corner top-RIGHT
//
// Each row of the map is one line. Leading/trailing whitespace and blank lines
// in the template literal are stripped during parsing.

export const DEFAULT_MAP = `
CCCCCCCCCCCC
CCCDCCCCDCCC
CCCCCCCCCCCC
CCCCCDCCCCCC
BBBBBBBBBBBB
............
............
............
TTTTTTTTTTTT
CCCCDCCCCCCC
CCCCCCCCCDCC
CCDCCCCCCCCC
CCCCCCCCCCCC
`;

// --- Deterministic detail picker (no RNG, position-based) ---

function pickDetailForCell(row: number, col: number) {
  // Simple deterministic hash so the same (row, col) always picks the same detail.
  const hash = (row * 31 + col * 17) % GRASS_DETAIL_TILES.length;
  return GRASS_DETAIL_TILES[hash]!;
}

// --- Character-to-cell mapping ---

function parseChar(ch: string, row: number, col: number): SceneCell {
  switch (ch) {
    case ".":
      return { tile: null };
    case "C":
      return { tile: { frame0: TILE_GRASS_CENTER.frame0, frame1: TILE_GRASS_CENTER.frame1 } };
    case "D": {
      const detail = pickDetailForCell(row, col);
      return { tile: { frame0: detail, frame1: detail } };
    }
    case "B":
      return { tile: TILE_GRASS_BOTTOM_MID };
    case "T":
      return { tile: TILE_GRASS_TOP_MID };
    case "J":
      return { tile: TILE_WATER_CORNER_BOTTOM_LEFT };
    case "K":
      return { tile: TILE_WATER_CORNER_BOTTOM_RIGHT };
    case "F":
      return { tile: TILE_GRASS_CORNER_TOP_LEFT };
    case "G":
      return { tile: TILE_GRASS_CORNER_TOP_RIGHT };
    default:
      throw new Error(
        `Unknown map character '${ch}' at row ${row}, col ${col}. ` +
          `Valid chars: . C D B T J K F G`,
      );
  }
}

// --- Parse a map string into a Scene ---

export function parseMap(mapString: string): Scene {
  // Split into lines, trim, drop empty lines (top/bottom whitespace from template literals)
  const lines = mapString
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    throw new Error("Map is empty");
  }

  const height = lines.length;
  const width = lines[0]!.length;

  // Sanity check: all rows must be same width
  for (let row = 0; row < height; row++) {
    if (lines[row]!.length !== width) {
      throw new Error(
        `Row ${row} has width ${lines[row]!.length}, expected ${width}. ` +
          `All rows must have the same number of characters.`,
      );
    }
  }

  // Build cells
  const cells: SceneCell[][] = [];
  for (let row = 0; row < height; row++) {
    const rowCells: SceneCell[] = [];
    for (let col = 0; col < width; col++) {
      rowCells.push(parseChar(lines[row]![col]!, row, col));
    }
    cells.push(rowCells);
  }

  // Derive coastlines for future pier placement
  // topIslandCoastline[col] = row index of the 'B' (or 'J'/'K') character in that column, or -1
  // bottomIslandCoastline[col] = row index of the 'T' (or 'F'/'G') character in that column, or -1
  const topIslandCoastline: number[] = new Array(width).fill(-1);
  const bottomIslandCoastline: number[] = new Array(width).fill(-1);
  for (let col = 0; col < width; col++) {
    for (let row = 0; row < height; row++) {
      const ch = lines[row]![col]!;
      if (ch === "B" || ch === "J" || ch === "K") {
        topIslandCoastline[col] = row;
      }
      if (ch === "T" || ch === "F" || ch === "G") {
        bottomIslandCoastline[col] = row;
      }
    }
  }

  return {
    width,
    height,
    cells,
    topIslandCoastline,
    bottomIslandCoastline,
    seed: null,
  };
}

// --- Public entry point (replaces old generateScene) ---

/**
 * Returns the default handcrafted scene.
 *
 * The seed parameter is currently ignored — kept for API compatibility with
 * the previous procedural generator. When multiple maps are added later,
 * the seed will be used to deterministically pick from the pool.
 */
export function generateScene(_seed: string = "default"): Scene {
  return parseMap(DEFAULT_MAP);
}
```

---

## Step 3 — Verify `components/SceneRenderer.tsx` works unchanged

No changes needed. The renderer iterates over `scene.cells[row][col]` and renders the tile. Confirm by running `npm run dev` and visiting `/dev/scene`.

---

## Step 4 — Dev page minor cleanup

In `app/dev/scene/page.tsx`, you can simplify since the seed no longer matters:

- Keep the seed input field, but add a small note next to it: "(currently ignored — default map is shown)".
- Keep all other controls (Width, Height, Scale) — but note that Width/Height are also currently irrelevant because the map dimensions are fixed by the map string. Add a note: "(determined by the map)".

Actually, simpler: just keep the controls as-is, since they don't break anything. The map will always render at its own dimensions. The Width/Height/Seed inputs become dev artifacts; we'll wire them up later if we add multi-map support.

---

## Acceptance criteria

- [ ] `lib/scene/generator.ts` rewritten as described.
- [ ] `parseMap` exported and works correctly.
- [ ] `generateScene()` returns the default map scene without throwing.
- [ ] `npm run lint` clean.
- [ ] `npm run build` succeeds.
- [ ] `npm run test:run` green (any existing tests for the generator may need stub-fixing — see notes).
- [ ] Visiting `/dev/scene` shows the handcrafted default map: top island (4 inland rows + 1 coastline row), 3 rows of water, bottom island (1 coastline row + 4 inland rows). Grass details visible where `D` characters are placed.
- [ ] Wave animation still works on `B` tiles (opponent coastline).

### Test note
If there are existing tests for the procedural `generateScene` that check coastline-array shapes or other procedural-specific behaviors, those tests will likely need updating. Codex should either:
- Update them to assert against the parsed default map structure, or
- Delete tests that don't make sense anymore (e.g. "seed produces different coastlines" — no longer applicable).

Codex should briefly note which tests it modified or removed.

---

## Non-goals

- ❌ No multiple maps yet — just one default.
- ❌ No seed-based map selection.
- ❌ No map editor UI.
- ❌ No procedural generation.
- ❌ No changes to `SceneRenderer.tsx`, `types.ts` types (other than adjusting `seed` to nullable).

---

## Wrap-up

- Suggested commit: `refactor: replace procedural scene with handcrafted ASCII map parser`
- Brief response back: confirm the map renders correctly, note any test changes.

---

## After Codex finishes — how YOU edit maps

Once this is implemented, editing the map is just editing the `DEFAULT_MAP` string in `lib/scene/generator.ts`. Refresh the dev page, see the change. No restart needed (HMR will pick it up).

To add a peninsula on the opponent's island, change something like:

```
CCCCCCCCCCCC          CCCCCCCCCCCC
CCCDCCCCDCCC    →     CCCDCCCCDCCC
CCCCCCCCCCCC          CCCCCCCCCCCC
CCCCCDCCCCCC          CCCJCCCCCCCC
BBBBBBBBBBBB          BBBBCCCBBBBB
............          ....BKB.....
                      ............
```

(Hand-drawn coastline shape with corner tiles in the right positions.)
