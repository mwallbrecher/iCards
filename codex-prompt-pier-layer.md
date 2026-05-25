# Codex Prompt — Pier Layer (Pier1 vertical + Pier2 horizontal)

> Copy this entire prompt into a fresh Codex chat in VS Code. Adds a second tile layer (piers) on top of the grass scene. User edits two ASCII map strings independently.

---

## Task: Add a pier layer on top of the existing grass scene. Pier tiles are mapped to lowercase letters; grass remains uppercase. The renderer draws grass first, then pier on top, perfectly aligned tile-by-tile.

### Context
- The grass tileset and scene parser are working (`lib/scene/tileset.ts`, `lib/scene/generator.ts`).
- The user has placed a second tileset atlas at `public/graphics/tilemap/pier_maptile.png`.
- Atlas dimensions: 32×32 tiles, just like the grass atlas. Number of rows and columns: not pre-specified in this prompt — Codex must hand-roll the position mapping using the table below.
- Pier1 is the vertical pier variant; Pier2 is the horizontal pier variant. Both come in a single atlas.
- Pier tiles are placed in a SEPARATE ASCII map string (`DEFAULT_PIER_MAP`), same dimensions as the grass map. The pier map is rendered as an overlay on top of the grass map.

### Architectural decision
**Two separate map strings, two separate cell grids, one Scene.** This keeps grass and pier independent — editing one doesn't disturb the other.

The `Scene` type gets a new `pierCells: SceneCell[][]` field that mirrors the shape of `cells` (the grass grid). The renderer iterates both grids; grass first, pier second, both positioned absolutely so they overlap perfectly.

---

## Step 1 — Extend `lib/scene/tileset.ts`

Add a new section to the existing file for the pier atlas. Place this at the bottom of the file, after the existing grass exports.

```typescript
// ============================================================
// PIER TILESET (pier_maptile.png)
// ============================================================

export const PIER_TILESET_PATH = "/graphics/tilemap/pier_maptile.png";

// Pier atlas uses the same 32px tile size as the grass atlas.
// Atlas dimensions: 6 columns × 9 rows.
// Layout per row (user-provided spec):
//
//   Row 0: pier1-water0-top-left, pier1-top-mid, pier1-water0-top-right,
//          pier1-water1-top-left, none, pier1-water1-top-right
//   Row 1: pier1-mid-left, pier1-mid-center, pier1-mid-right, none, none, none
//   Row 2: pier1-water0-bottom-left, pier1-water-bottom-mid, pier1-water0-bottom-right,
//          pier1-water1-bottom-left, none, pier1-water1-bottom-right
//   Row 3: pier1-top-left, none, pier1-top-right, pier2-top-left, pier2-top-mid, pier2-top-right
//   Row 4: none, none, none, pier2-mid-left, pier2-mid-center, pier2-mid-right
//   Row 5: pier1-bottom-left, pier1-bottom-mid, pier1-bottom-right,
//          pier2-bottom-left, pier2-bottom-mid, pier2-bottom-right
//   Row 6: pier2-water0-top-left, none, pier2-water0-top-right,
//          pier2-water1-top-left, none, pier2-water1-top-right
//   Row 7: (all none)
//   Row 8: pier2-water0-bottom-left, pier2-water-bottom-mid, pier2-water0-bottom-right,
//          pier2-water1-bottom-left, none, pier2-water1-bottom-right

export const PIER_ATLAS_COLS = 6;
export const PIER_ATLAS_ROWS = 9;

// --- Pier1 (vertical pier) tile coordinates ---

// Wave-animated water-edge tiles (frame0 and frame1)
export const PIER1_W0_TOP_LEFT: TileCoord = { col: 0, row: 0 };
export const PIER1_TOP_MID: TileCoord = { col: 1, row: 0 };
export const PIER1_W0_TOP_RIGHT: TileCoord = { col: 2, row: 0 };
export const PIER1_W1_TOP_LEFT: TileCoord = { col: 3, row: 0 };
export const PIER1_W1_TOP_RIGHT: TileCoord = { col: 5, row: 0 };

export const PIER1_MID_LEFT: TileCoord = { col: 0, row: 1 };
export const PIER1_MID_CENTER: TileCoord = { col: 1, row: 1 };
export const PIER1_MID_RIGHT: TileCoord = { col: 2, row: 1 };

export const PIER1_W0_BOTTOM_LEFT: TileCoord = { col: 0, row: 2 };
export const PIER1_W_BOTTOM_MID: TileCoord = { col: 1, row: 2 };
export const PIER1_W0_BOTTOM_RIGHT: TileCoord = { col: 2, row: 2 };
export const PIER1_W1_BOTTOM_LEFT: TileCoord = { col: 3, row: 2 };
export const PIER1_W1_BOTTOM_RIGHT: TileCoord = { col: 5, row: 2 };

// Pier1 on-land tiles (no wave)
export const PIER1_TOP_LEFT: TileCoord = { col: 0, row: 3 };
export const PIER1_TOP_RIGHT: TileCoord = { col: 2, row: 3 };
export const PIER1_BOTTOM_LEFT: TileCoord = { col: 0, row: 5 };
export const PIER1_BOTTOM_MID: TileCoord = { col: 1, row: 5 };
export const PIER1_BOTTOM_RIGHT: TileCoord = { col: 2, row: 5 };

// --- Pier2 (horizontal pier) tile coordinates ---

// Pier2 on-land tiles
export const PIER2_TOP_LEFT: TileCoord = { col: 3, row: 3 };
export const PIER2_TOP_MID: TileCoord = { col: 4, row: 3 };
export const PIER2_TOP_RIGHT: TileCoord = { col: 5, row: 3 };
export const PIER2_MID_LEFT: TileCoord = { col: 3, row: 4 };
export const PIER2_MID_CENTER: TileCoord = { col: 4, row: 4 };
export const PIER2_MID_RIGHT: TileCoord = { col: 5, row: 4 };
export const PIER2_BOTTOM_LEFT: TileCoord = { col: 3, row: 5 };
export const PIER2_BOTTOM_MID: TileCoord = { col: 4, row: 5 };
export const PIER2_BOTTOM_RIGHT: TileCoord = { col: 5, row: 5 };

// Pier2 wave-animated water-edge tiles
export const PIER2_W0_TOP_LEFT: TileCoord = { col: 0, row: 6 };
export const PIER2_W0_TOP_RIGHT: TileCoord = { col: 2, row: 6 };
export const PIER2_W1_TOP_LEFT: TileCoord = { col: 3, row: 6 };
export const PIER2_W1_TOP_RIGHT: TileCoord = { col: 5, row: 6 };

export const PIER2_W0_BOTTOM_LEFT: TileCoord = { col: 0, row: 8 };
export const PIER2_W_BOTTOM_MID: TileCoord = { col: 1, row: 8 };
export const PIER2_W0_BOTTOM_RIGHT: TileCoord = { col: 2, row: 8 };
export const PIER2_W1_BOTTOM_LEFT: TileCoord = { col: 3, row: 8 };
export const PIER2_W1_BOTTOM_RIGHT: TileCoord = { col: 5, row: 8 };

// --- Wave-animated bundles for tiles that have both frames ---

export const TILE_PIER1_TOP_LEFT_WAVE: WaveAnimatedTile = {
  frame0: PIER1_W0_TOP_LEFT,
  frame1: PIER1_W1_TOP_LEFT,
};

export const TILE_PIER1_TOP_RIGHT_WAVE: WaveAnimatedTile = {
  frame0: PIER1_W0_TOP_RIGHT,
  frame1: PIER1_W1_TOP_RIGHT,
};

export const TILE_PIER1_BOTTOM_LEFT_WAVE: WaveAnimatedTile = {
  frame0: PIER1_W0_BOTTOM_LEFT,
  frame1: PIER1_W1_BOTTOM_LEFT,
};

export const TILE_PIER1_BOTTOM_RIGHT_WAVE: WaveAnimatedTile = {
  frame0: PIER1_W0_BOTTOM_RIGHT,
  frame1: PIER1_W1_BOTTOM_RIGHT,
};

// pier1-top-mid and pier1-water-bottom-mid don't have separate water1 frames in the spec —
// they're either static or the wave is implied. Treat them as static (same frame both ticks).
export const TILE_PIER1_TOP_MID: WaveAnimatedTile = {
  frame0: PIER1_TOP_MID,
  frame1: PIER1_TOP_MID,
};

export const TILE_PIER1_W_BOTTOM_MID: WaveAnimatedTile = {
  frame0: PIER1_W_BOTTOM_MID,
  frame1: PIER1_W_BOTTOM_MID,
};

// Pier2 wave bundles
export const TILE_PIER2_TOP_LEFT_WAVE: WaveAnimatedTile = {
  frame0: PIER2_W0_TOP_LEFT,
  frame1: PIER2_W1_TOP_LEFT,
};

export const TILE_PIER2_TOP_RIGHT_WAVE: WaveAnimatedTile = {
  frame0: PIER2_W0_TOP_RIGHT,
  frame1: PIER2_W1_TOP_RIGHT,
};

export const TILE_PIER2_BOTTOM_LEFT_WAVE: WaveAnimatedTile = {
  frame0: PIER2_W0_BOTTOM_LEFT,
  frame1: PIER2_W1_BOTTOM_LEFT,
};

export const TILE_PIER2_BOTTOM_RIGHT_WAVE: WaveAnimatedTile = {
  frame0: PIER2_W0_BOTTOM_RIGHT,
  frame1: PIER2_W1_BOTTOM_RIGHT,
};

export const TILE_PIER2_W_BOTTOM_MID: WaveAnimatedTile = {
  frame0: PIER2_W_BOTTOM_MID,
  frame1: PIER2_W_BOTTOM_MID,
};
```

**Important:** A new property is implied — pier tiles come from a DIFFERENT atlas than grass tiles. The current `WaveAnimatedTile` type only has `frame0` and `frame1` (the coords). Renderer needs to know WHICH atlas to look up the coords in.

**Solution:** Extend the `SceneCell` type with an `atlas` field, or carry that info another way. See Step 2 for the chosen approach.

---

## Step 2 — Update `lib/scene/types.ts`

```typescript
import type { WaveAnimatedTile } from "./tileset";

export type AtlasName = "grass" | "pier";

export type SceneCell = {
  tile: WaveAnimatedTile | null;
  atlas: AtlasName;  // which atlas the coords reference
};

export type Scene = {
  width: number;
  height: number;
  cells: SceneCell[][];       // grass layer (bottom)
  pierCells: SceneCell[][];   // pier layer (top, rendered over grass)
  topIslandCoastline: number[];
  bottomIslandCoastline: number[];
  seed: string | null;
};
```

`pierCells[row][col]` either contains a pier tile (atlas: "pier") or `null` for "no pier here".

---

## Step 3 — Update `lib/scene/generator.ts`

Add pier map parsing alongside the grass map parsing. Most of the existing parser stays; we add a parallel function for pier characters.

Add at the top:

```typescript
import {
  // ... existing imports ...
  TILE_PIER1_TOP_LEFT_WAVE,
  TILE_PIER1_TOP_MID,
  TILE_PIER1_TOP_RIGHT_WAVE,
  PIER1_MID_LEFT,
  PIER1_MID_CENTER,
  PIER1_MID_RIGHT,
  TILE_PIER1_BOTTOM_LEFT_WAVE,
  TILE_PIER1_W_BOTTOM_MID,
  TILE_PIER1_BOTTOM_RIGHT_WAVE,
  PIER1_TOP_LEFT,
  PIER1_TOP_RIGHT,
  PIER1_BOTTOM_LEFT,
  PIER1_BOTTOM_MID,
  PIER1_BOTTOM_RIGHT,
  PIER2_TOP_LEFT,
  PIER2_TOP_MID,
  PIER2_TOP_RIGHT,
  PIER2_MID_LEFT,
  PIER2_MID_CENTER,
  PIER2_MID_RIGHT,
  PIER2_BOTTOM_LEFT,
  PIER2_BOTTOM_MID,
  PIER2_BOTTOM_RIGHT,
  TILE_PIER2_TOP_LEFT_WAVE,
  TILE_PIER2_TOP_RIGHT_WAVE,
  TILE_PIER2_BOTTOM_LEFT_WAVE,
  TILE_PIER2_W_BOTTOM_MID,
  TILE_PIER2_BOTTOM_RIGHT_WAVE,
} from "./tileset";
```

Then update grass cell creation to add `atlas: "grass"`:

```typescript
// In parseChar function for grass:
case "C":
  return { tile: TILE_GRASS_CENTER, atlas: "grass" };
// ...etc for every grass case
case ".":
  return { tile: null, atlas: "grass" };
```

Then add the pier parser:

```typescript
// ============================================================
// PIER MAP CHARACTER MAPPING
// ============================================================
//
// Lowercase letters a-z map to pier tiles. The dot (.) means "no pier here".
//
// Pier1 (vertical pier): a-r
//   a = pier1-water0-top-left              (wave-animated, pairs with d)
//   b = pier1-top-mid                      (static)
//   c = pier1-water0-top-right             (wave-animated, pairs with e)
//   d = pier1-water1-top-left              [reserved, internally covered by 'a' bundle]
//   e = pier1-water1-top-right             [reserved, internally covered by 'c' bundle]
//   f = pier1-mid-left                     (static)
//   g = pier1-mid-center                   (static)
//   h = pier1-mid-right                    (static)
//   i = pier1-water0-bottom-left           (wave-animated, pairs with l)
//   j = pier1-water-bottom-mid             (static — only one frame defined)
//   k = pier1-water0-bottom-right          (wave-animated, pairs with m)
//   l = pier1-water1-bottom-left           [reserved, internally covered by 'i' bundle]
//   m = pier1-water1-bottom-right          [reserved, internally covered by 'k' bundle]
//   n = pier1-top-left                     (on-land, static)
//   o = pier1-top-right                    (on-land, static)
//   p = pier1-bottom-left                  (on-land, static)
//   q = pier1-bottom-mid                   (on-land, static)
//   r = pier1-bottom-right                 (on-land, static)
//
// Pier2 (horizontal pier): s-z plus extras
//   s = pier2-top-left                     (on-land, static)
//   t = pier2-top-mid                      (on-land, static)
//   u = pier2-top-right                    (on-land, static)
//   v = pier2-mid-left                     (static)
//   w = pier2-mid-center                   (static)
//   x = pier2-mid-right                    (static)
//   y = pier2-bottom-left                  (on-land, static)
//   z = pier2-bottom-mid                   (on-land, static)
//
// Pier2 wave-animated tiles (use special chars since lowercase letters ran out)
//   ! = pier2-bottom-right                 (on-land, static)
//   @ = pier2-water0-top-left              (wave, pairs with #)
//   # = pier2-water1-top-left              [reserved]
//   $ = pier2-water0-top-right             (wave, pairs with %)
//   % = pier2-water1-top-right             [reserved]
//   & = pier2-water0-bottom-left           (wave, pairs with +)
//   * = pier2-water-bottom-mid             (static — only one frame)
//   ( = pier2-water0-bottom-right          (wave, pairs with ))
//   + = pier2-water1-bottom-left           [reserved]
//   ) = pier2-water1-bottom-right          [reserved]
//
// User-facing chars are listed in the table above. "Reserved" chars are 
// internally paired into wave bundles and should NOT appear in maps.

function parsePierChar(ch: string, row: number, col: number): SceneCell {
  switch (ch) {
    case ".":
      return { tile: null, atlas: "pier" };
    // Pier1
    case "a":
      return { tile: TILE_PIER1_TOP_LEFT_WAVE, atlas: "pier" };
    case "b":
      return { tile: TILE_PIER1_TOP_MID, atlas: "pier" };
    case "c":
      return { tile: TILE_PIER1_TOP_RIGHT_WAVE, atlas: "pier" };
    case "f":
      return { tile: { frame0: PIER1_MID_LEFT, frame1: PIER1_MID_LEFT }, atlas: "pier" };
    case "g":
      return { tile: { frame0: PIER1_MID_CENTER, frame1: PIER1_MID_CENTER }, atlas: "pier" };
    case "h":
      return { tile: { frame0: PIER1_MID_RIGHT, frame1: PIER1_MID_RIGHT }, atlas: "pier" };
    case "i":
      return { tile: TILE_PIER1_BOTTOM_LEFT_WAVE, atlas: "pier" };
    case "j":
      return { tile: TILE_PIER1_W_BOTTOM_MID, atlas: "pier" };
    case "k":
      return { tile: TILE_PIER1_BOTTOM_RIGHT_WAVE, atlas: "pier" };
    case "n":
      return { tile: { frame0: PIER1_TOP_LEFT, frame1: PIER1_TOP_LEFT }, atlas: "pier" };
    case "o":
      return { tile: { frame0: PIER1_TOP_RIGHT, frame1: PIER1_TOP_RIGHT }, atlas: "pier" };
    case "p":
      return { tile: { frame0: PIER1_BOTTOM_LEFT, frame1: PIER1_BOTTOM_LEFT }, atlas: "pier" };
    case "q":
      return { tile: { frame0: PIER1_BOTTOM_MID, frame1: PIER1_BOTTOM_MID }, atlas: "pier" };
    case "r":
      return { tile: { frame0: PIER1_BOTTOM_RIGHT, frame1: PIER1_BOTTOM_RIGHT }, atlas: "pier" };
    // Pier2
    case "s":
      return { tile: { frame0: PIER2_TOP_LEFT, frame1: PIER2_TOP_LEFT }, atlas: "pier" };
    case "t":
      return { tile: { frame0: PIER2_TOP_MID, frame1: PIER2_TOP_MID }, atlas: "pier" };
    case "u":
      return { tile: { frame0: PIER2_TOP_RIGHT, frame1: PIER2_TOP_RIGHT }, atlas: "pier" };
    case "v":
      return { tile: { frame0: PIER2_MID_LEFT, frame1: PIER2_MID_LEFT }, atlas: "pier" };
    case "w":
      return { tile: { frame0: PIER2_MID_CENTER, frame1: PIER2_MID_CENTER }, atlas: "pier" };
    case "x":
      return { tile: { frame0: PIER2_MID_RIGHT, frame1: PIER2_MID_RIGHT }, atlas: "pier" };
    case "y":
      return { tile: { frame0: PIER2_BOTTOM_LEFT, frame1: PIER2_BOTTOM_LEFT }, atlas: "pier" };
    case "z":
      return { tile: { frame0: PIER2_BOTTOM_MID, frame1: PIER2_BOTTOM_MID }, atlas: "pier" };
    case "!":
      return { tile: { frame0: PIER2_BOTTOM_RIGHT, frame1: PIER2_BOTTOM_RIGHT }, atlas: "pier" };
    case "@":
      return { tile: TILE_PIER2_TOP_LEFT_WAVE, atlas: "pier" };
    case "$":
      return { tile: TILE_PIER2_TOP_RIGHT_WAVE, atlas: "pier" };
    case "&":
      return { tile: TILE_PIER2_BOTTOM_LEFT_WAVE, atlas: "pier" };
    case "*":
      return { tile: TILE_PIER2_W_BOTTOM_MID, atlas: "pier" };
    case "(":
      return { tile: TILE_PIER2_BOTTOM_RIGHT_WAVE, atlas: "pier" };
    default:
      throw new Error(
        `Unknown pier-map character '${ch}' at row ${row}, col ${col}.`,
      );
  }
}

function parsePierMap(mapString: string, expectedWidth: number, expectedHeight: number): SceneCell[][] {
  const lines = mapString
    .split("\n")
    .map((line) => line.trimEnd())  // keep leading whitespace if any
    .filter((line) => line.length > 0);

  if (lines.length !== expectedHeight) {
    throw new Error(
      `Pier map has ${lines.length} rows, expected ${expectedHeight} to match grass map.`,
    );
  }

  const pierCells: SceneCell[][] = [];
  for (let row = 0; row < expectedHeight; row++) {
    const line = lines[row]!;
    if (line.length !== expectedWidth) {
      throw new Error(
        `Pier map row ${row} has width ${line.length}, expected ${expectedWidth} to match grass map.`,
      );
    }
    const rowCells: SceneCell[] = [];
    for (let col = 0; col < expectedWidth; col++) {
      rowCells.push(parsePierChar(line[col]!, row, col));
    }
    pierCells.push(rowCells);
  }

  return pierCells;
}
```

Now add a default pier map (you can keep it minimal — user will edit later):

```typescript
export const DEFAULT_PIER_MAP = `
............
............
............
............
............
............
............
............
............
............
............
............
............
`;
```

(All dots. User edits to place piers. Must match exact dimensions of `DEFAULT_MAP`.)

Update `generateScene` to return both layers:

```typescript
export function generateScene(_seed: string = "default"): Scene {
  const grassScene = parseMap(DEFAULT_MAP);  // existing logic, now returns cells with atlas: "grass"
  const pierCells = parsePierMap(DEFAULT_PIER_MAP, grassScene.width, grassScene.height);

  return {
    ...grassScene,
    pierCells,
  };
}
```

---

## Step 4 — Update `components/SceneRenderer.tsx`

The renderer now draws two layers. Pier layer is on top.

Key changes:
1. Import `PIER_TILESET_PATH`, `PIER_ATLAS_COLS`, `PIER_ATLAS_ROWS` from `tileset.ts`.
2. Pick the atlas path/size based on `cell.atlas`.
3. Render `scene.cells` (grass) first, then `scene.pierCells` (pier) on top.

```tsx
import {
  TILE_SIZE,
  TILESET_PATH,
  ATLAS_COLS,
  ATLAS_ROWS,
  PIER_TILESET_PATH,
  PIER_ATLAS_COLS,
  PIER_ATLAS_ROWS,
  WATER_BACKGROUND_COLOR,
} from "@/lib/scene/tileset";

// ... existing setup ...

function renderCellGrid(
  cells: SceneCell[][],
  waveFrame: 0 | 1,
  computedScale: number,
  scene: Scene,
) {
  const tilePx = TILE_SIZE * computedScale;

  return cells.map((row, rowIdx) =>
    row.map((cell, colIdx) => {
      if (cell.tile === null) return null;

      const isGrass = cell.atlas === "grass";
      const atlasPath = isGrass ? TILESET_PATH : PIER_TILESET_PATH;
      const atlasCols = isGrass ? ATLAS_COLS : PIER_ATLAS_COLS;
      const atlasRows = isGrass ? ATLAS_ROWS : PIER_ATLAS_ROWS;
      const atlasWidthPx = atlasCols * tilePx;
      const atlasHeightPx = atlasRows * tilePx;

      const coord = waveFrame === 0 ? cell.tile.frame0 : cell.tile.frame1;
      return (
        <div
          key={`${cell.atlas}-${rowIdx}-${colIdx}`}
          style={{
            position: "absolute",
            left: colIdx * tilePx,
            top: rowIdx * tilePx,
            width: tilePx,
            height: tilePx,
            backgroundImage: `url(${atlasPath})`,
            backgroundPosition: `-${coord.col * tilePx}px -${coord.row * tilePx}px`,
            backgroundSize: `${atlasWidthPx}px ${atlasHeightPx}px`,
            backgroundRepeat: "no-repeat",
            imageRendering: "pixelated",
          }}
        />
      );
    }),
  );
}

// In the main render:
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
    {/* Grass layer (bottom) */}
    {renderCellGrid(scene.cells, waveFrame, computedScale, scene)}
    {/* Pier layer (top, rendered over grass) */}
    {renderCellGrid(scene.pierCells, waveFrame, computedScale, scene)}
  </div>
);
```

Since both layers use absolute positioning at the same coordinates and the pier layer is rendered later (so it's on top in DOM order), pier tiles correctly overlap the grass tiles below them.

---

## Step 5 — Verify

```bash
npm run lint
npm run build
npm run test:run
```

All must pass. Then visit `/dev/scene` and verify:

1. The grass scene still renders correctly (no piers visible yet because `DEFAULT_PIER_MAP` is all dots).
2. Open `lib/scene/generator.ts`, edit `DEFAULT_PIER_MAP` — e.g. replace one `.` with `g` (pier1 mid-center). Refresh the page. A single pier1 mid-center tile should appear at that position, overlaid on the grass.
3. Wave animation continues to work for the grass coastline.
4. No console errors.

---

## Acceptance criteria

- [ ] `lib/scene/tileset.ts` has all pier tile constants and wave bundles.
- [ ] `lib/scene/types.ts` has `atlas` field on `SceneCell` and `pierCells` on `Scene`.
- [ ] `lib/scene/generator.ts` parses both grass and pier maps. Both default maps export-mutated by user remain editable.
- [ ] `components/SceneRenderer.tsx` renders grass then pier on top, each with correct atlas lookup.
- [ ] `npm run lint`, `npm run build`, `npm run test:run` all green.
- [ ] Manually changing one character in `DEFAULT_PIER_MAP` shows the correct pier tile at the right position on the dev page.
- [ ] Pier wave animation works (visible if the user places a pier tile in a water cell — wave-animated pier tiles swap frames every 300ms in sync with grass coastline).

---

## Non-goals

- ❌ No actual default pier in the scene — `DEFAULT_PIER_MAP` is all dots; user will fill in.
- ❌ No new dev page features.
- ❌ No changes to game integration (`GameView` doesn't render scene yet).
- ❌ Don't add Z-index management beyond DOM order — pier-after-grass DOM order is sufficient.

---

## Wrap-up

- Suggested commit: `feat: add pier layer rendered over grass scene`
- Brief response back: confirm both layers render, share the new structure of `Scene`, mention any test changes needed.

---

## After Codex finishes

Codex creates an empty pier map by default. You edit `DEFAULT_PIER_MAP` in `lib/scene/generator.ts` to place piers. Use the character mapping from Step 3.

For reference, the user-facing character table is included in the code comments above. **Reserved characters (d, e, l, m, #, %, +, )) are not used in maps** — they're internally bundled into wave-animated tiles via 'a', 'c', 'i', 'k', '@', '$', '&', '('.
