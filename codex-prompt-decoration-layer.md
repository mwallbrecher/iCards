# Codex Prompt — Decoration Layer (Land Assets 1-5)

> Copy this entire prompt into a fresh Codex chat in VS Code. Adds a third rendering layer for decoration assets (rocks, trees, lanterns, etc.) on top of grass+pier scene. User places assets by editing a config file with tile coordinates.

---

## Task: Add a decoration layer that renders 5 different land asset types on top of the existing grass+pier scene. Some assets pick a random variant at game start (deterministic by seed). Some animate between variants over time (deterministic by wall clock + seed). User places each asset by writing tile coordinates in a config file.

### Context
- The grass scene generator and pier overlay are working.
- Five decoration atlas files are placed by the user at:
  - `public/graphics/decorations/land-1-rh2.png` (256×128)
  - `public/graphics/decorations/land-2-rh3.png` (256×192)
  - `public/graphics/decorations/land-3-rh6.png` (160×384)
  - `public/graphics/decorations/land-4-rh3.png` (256×192)
  - `public/graphics/decorations/land-5-rh3.png` (128×192)
- Each atlas has 2 rows: row 0 is "normal" variant, row 1 is "alternate" variant.
- Tile-grid alignment: 32×32 px (same as grass/pier).

### Atlas inventory (provided by user)

#### `land-1-rh2.png` — 256×128, row height 64px, 4 sub-assets of varying widths
- Sub-asset 0: x = 0..96 (width 96, = 3 tiles)
- Sub-asset 1: x = 96..160 (width 64, = 2 tiles)
- Sub-asset 2: x = 160..224 (width 64, = 2 tiles)
- Sub-asset 3: x = 224..256 (width 32, = 1 tile)
- Asset height: 64px (= 2 tiles)
- **Behavior:** Per game (seed-deterministic), each sub-asset independently picks row 0 or row 1. Static for the whole game.

#### `land-2-rh3.png` — 256×192, row height 96px, 2 sub-assets
- Sub-asset 0: x = 0..128 (width 128, = 4 tiles)
- Sub-asset 1: x = 128..256 (width 128, = 4 tiles)
- Asset height: 96px (= 3 tiles)
- **Behavior:** Per game, each sub-asset independently picks row 0 or 1. Static.

#### `land-3-rh6.png` — 160×384, row height 192px, 1 sub-asset
- Sub-asset 0: x = 0..160 (width 160, = 5 tiles)
- Asset height: 192px (= 6 tiles)
- **Behavior:** Per game, picks row 0 or 1. Static.

#### `land-4-rh3.png` — 256×192, row height 96px, 2 sub-assets
- Sub-asset 0: x = 0..128 (width 128, = 4 tiles)
- Sub-asset 1: x = 128..256 (width 128, = 4 tiles)
- Asset height: 96px (= 3 tiles)
- **Behavior:** ANIMATED. Each sub-asset switches between row 0 and row 1 deterministically, every 6 seconds, with a phase offset derived from the sub-asset's slot name (so they don't switch simultaneously).

#### `land-5-rh3.png` — 128×192, row height 96px, 1 sub-asset repeated as 2 columns × 2 rows
- Atlas is 2 columns wide (col 0: x = 0..64, col 1: x = 64..128)
- 2 rows (row 0: y = 0..96, row 1: y = 96..192)
- Asset display size: 64×96px (= 2 tiles wide × 3 tiles tall)
- **Behavior:** Per game (seed-deterministic), pick column 0 or column 1. That column is fixed for the whole game. The row animates: switches between row 0 and row 1 every 6 seconds, with a phase offset derived from the slot name.

### Architectural decisions
- **One config file** where the user writes tile coordinates per slot. Empty coords = not rendered.
- **Deterministic per-game randomization** via the game seed for static row picks.
- **Deterministic time-based animation** for `land-4` and `land-5` row switching: `slotIndex = Math.floor((wallClockMs + phaseOffset) / 6000)`. Both clients with the same seed see the same flips.
- **Phase offset per slot:** hash the slot name into a number 0..6000ms so different slots flip at different times.
- **No clipping or out-of-bounds checking.** If the user places an asset partly off-screen, it just clips visually. User's responsibility.
- Tile coordinates refer to the asset's **top-left corner**.

---

## Step 1 — Create `lib/scene/decorations.ts`

Atlas definitions and asset metadata.

```typescript
export type DecorationAtlas = {
  /** Path to the PNG */
  path: string;
  /** Total atlas width in pixels */
  atlasWidth: number;
  /** Total atlas height in pixels */
  atlasHeight: number;
  /** Height of one variant row, in pixels */
  rowHeight: number;
};

export type DecorationSubAsset = {
  /** Identifier used in the slot config and for phase offset hashing */
  slotName: string;
  /** Display name (for debug) */
  label: string;
  /** Atlas this sub-asset comes from */
  atlasKey: DecorationAtlasKey;
  /** X offset (in atlas pixels) of the left edge of this sub-asset */
  xPx: number;
  /** Width of this sub-asset in pixels */
  widthPx: number;
  /** Height of this sub-asset in pixels (equal to atlas rowHeight for now) */
  heightPx: number;
  /** Tile size on the scene grid (in tiles) */
  tileWidth: number;
  tileHeight: number;
  /** Behavior of variant selection */
  variantBehavior:
    | { kind: "static" }                       // row picked at game start by seed
    | { kind: "animated" }                     // row switches every 6s
    | { kind: "animated-column"; columnCount: number }; // for land-5: column static, row animates
};

export type DecorationAtlasKey = "land1" | "land2" | "land3" | "land4" | "land5";

// --- Atlas definitions ---

export const DECORATION_ATLASES: Record<DecorationAtlasKey, DecorationAtlas> = {
  land1: {
    path: "/graphics/decorations/land-1-rh2.png",
    atlasWidth: 256,
    atlasHeight: 128,
    rowHeight: 64,
  },
  land2: {
    path: "/graphics/decorations/land-2-rh3.png",
    atlasWidth: 256,
    atlasHeight: 192,
    rowHeight: 96,
  },
  land3: {
    path: "/graphics/decorations/land-3-rh6.png",
    atlasWidth: 160,
    atlasHeight: 384,
    rowHeight: 192,
  },
  land4: {
    path: "/graphics/decorations/land-4-rh3.png",
    atlasWidth: 256,
    atlasHeight: 192,
    rowHeight: 96,
  },
  land5: {
    path: "/graphics/decorations/land-5-rh3.png",
    atlasWidth: 128,
    atlasHeight: 192,
    rowHeight: 96,
  },
};

// --- Sub-asset definitions ---

const TILE_PX = 32;

export const DECORATION_SUB_ASSETS: DecorationSubAsset[] = [
  // land1: 4 sub-assets of varying widths, all 64px tall (= 2 tiles)
  {
    slotName: "land1_0",
    label: "land1 asset 0 (96px wide)",
    atlasKey: "land1",
    xPx: 0,
    widthPx: 96,
    heightPx: 64,
    tileWidth: 96 / TILE_PX,   // 3
    tileHeight: 64 / TILE_PX,  // 2
    variantBehavior: { kind: "static" },
  },
  {
    slotName: "land1_1",
    label: "land1 asset 1 (64px wide)",
    atlasKey: "land1",
    xPx: 96,
    widthPx: 64,
    heightPx: 64,
    tileWidth: 2,
    tileHeight: 2,
    variantBehavior: { kind: "static" },
  },
  {
    slotName: "land1_2",
    label: "land1 asset 2 (64px wide)",
    atlasKey: "land1",
    xPx: 160,
    widthPx: 64,
    heightPx: 64,
    tileWidth: 2,
    tileHeight: 2,
    variantBehavior: { kind: "static" },
  },
  {
    slotName: "land1_3",
    label: "land1 asset 3 (32px wide)",
    atlasKey: "land1",
    xPx: 224,
    widthPx: 32,
    heightPx: 64,
    tileWidth: 1,
    tileHeight: 2,
    variantBehavior: { kind: "static" },
  },
  // land2: 2 sub-assets, both 128x96
  {
    slotName: "land2_0",
    label: "land2 asset 0",
    atlasKey: "land2",
    xPx: 0,
    widthPx: 128,
    heightPx: 96,
    tileWidth: 4,
    tileHeight: 3,
    variantBehavior: { kind: "static" },
  },
  {
    slotName: "land2_1",
    label: "land2 asset 1",
    atlasKey: "land2",
    xPx: 128,
    widthPx: 128,
    heightPx: 96,
    tileWidth: 4,
    tileHeight: 3,
    variantBehavior: { kind: "static" },
  },
  // land3: 1 sub-asset, 160x192
  {
    slotName: "land3_0",
    label: "land3 asset 0",
    atlasKey: "land3",
    xPx: 0,
    widthPx: 160,
    heightPx: 192,
    tileWidth: 5,
    tileHeight: 6,
    variantBehavior: { kind: "static" },
  },
  // land4: 2 sub-assets, animated row switching
  {
    slotName: "land4_0",
    label: "land4 asset 0 (animated)",
    atlasKey: "land4",
    xPx: 0,
    widthPx: 128,
    heightPx: 96,
    tileWidth: 4,
    tileHeight: 3,
    variantBehavior: { kind: "animated" },
  },
  {
    slotName: "land4_1",
    label: "land4 asset 1 (animated)",
    atlasKey: "land4",
    xPx: 128,
    widthPx: 128,
    heightPx: 96,
    tileWidth: 4,
    tileHeight: 3,
    variantBehavior: { kind: "animated" },
  },
  // land5: 1 sub-asset, column picked at start, row animated
  {
    slotName: "land5_0",
    label: "land5 asset 0 (column-static, row-animated)",
    atlasKey: "land5",
    xPx: 0, // ignored — column picked at runtime
    widthPx: 64,
    heightPx: 96,
    tileWidth: 2,
    tileHeight: 3,
    variantBehavior: { kind: "animated-column", columnCount: 2 },
  },
];

// --- Helper: hash string to a deterministic number ---

export function hashStringToNumber(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// --- Variant resolution ---

const ANIMATION_PERIOD_MS = 6000;

/**
 * For a given sub-asset, determines which atlas (col, row) to display right now.
 *
 * - "static" → row is picked once per game from seed.
 * - "animated" → row toggles every 6000ms, with a phase offset per slot.
 * - "animated-column" → column picked once per game from seed; row toggles every 6000ms.
 */
export function resolveSubAssetVariant(
  subAsset: DecorationSubAsset,
  seed: string,
  nowMs: number,
): { atlasX: number; atlasY: number } {
  const atlas = DECORATION_ATLASES[subAsset.atlasKey];

  switch (subAsset.variantBehavior.kind) {
    case "static": {
      // Pick row 0 or 1 from seed + slotName
      const hash = hashStringToNumber(seed + ":" + subAsset.slotName);
      const row = hash % 2;
      return { atlasX: subAsset.xPx, atlasY: row * atlas.rowHeight };
    }
    case "animated": {
      // Phase offset 0..ANIMATION_PERIOD_MS based on slot name
      const phaseOffset =
        hashStringToNumber(subAsset.slotName + ":phase") % ANIMATION_PERIOD_MS;
      const slot = Math.floor((nowMs + phaseOffset) / ANIMATION_PERIOD_MS);
      const row = slot % 2;
      return { atlasX: subAsset.xPx, atlasY: row * atlas.rowHeight };
    }
    case "animated-column": {
      // Column picked per game; row animates
      const colHash = hashStringToNumber(seed + ":" + subAsset.slotName + ":col");
      const col = colHash % subAsset.variantBehavior.columnCount;
      const xPx = col * subAsset.widthPx;

      const phaseOffset =
        hashStringToNumber(subAsset.slotName + ":phase") % ANIMATION_PERIOD_MS;
      const slot = Math.floor((nowMs + phaseOffset) / ANIMATION_PERIOD_MS);
      const row = slot % 2;
      return { atlasX: xPx, atlasY: row * atlas.rowHeight };
    }
  }
}
```

---

## Step 2 — Create `lib/scene/decoration-config.ts`

User edits this file. One entry per sub-asset. `null` = not on screen.

```typescript
/**
 * USER EDITS THIS FILE.
 *
 * Each entry corresponds to one decoration sub-asset.
 * - Set { tileX, tileY } to place the asset's TOP-LEFT corner at that tile position.
 * - Set to null to keep that asset off the screen.
 *
 * tile coordinates are 0-indexed and reference the scene grid (same coords as grass+pier).
 *
 * To add the same asset multiple times: not supported in this version. If needed later,
 * change values from `Placement | null` to `Placement[]`.
 */

export type Placement = { tileX: number; tileY: number };

export const DECORATION_PLACEMENTS: Record<string, Placement | null> = {
  // --- land1 (rocks/trees, 64px tall, single-row variant per game) ---
  land1_0: null,   // 3 tiles wide, 2 tiles tall
  land1_1: null,   // 2 tiles wide, 2 tiles tall
  land1_2: null,   // 2 tiles wide, 2 tiles tall
  land1_3: null,   // 1 tile wide, 2 tiles tall

  // --- land2 (larger props, 96px tall, single-row variant per game) ---
  land2_0: null,   // 4 tiles wide, 3 tiles tall
  land2_1: null,   // 4 tiles wide, 3 tiles tall

  // --- land3 (huge prop, 192px tall, single-row variant per game) ---
  land3_0: null,   // 5 tiles wide, 6 tiles tall

  // --- land4 (animated, 96px tall, row switches every ~6s) ---
  land4_0: null,   // 4 tiles wide, 3 tiles tall
  land4_1: null,   // 4 tiles wide, 3 tiles tall

  // --- land5 (column picked at start, row animated) ---
  land5_0: null,   // 2 tiles wide, 3 tiles tall
};
```

---

## Step 3 — Create `components/DecorationLayer.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import { TILE_SIZE } from "@/lib/scene/tileset";
import {
  DECORATION_ATLASES,
  DECORATION_SUB_ASSETS,
  resolveSubAssetVariant,
  type DecorationSubAsset,
} from "@/lib/scene/decorations";
import { DECORATION_PLACEMENTS } from "@/lib/scene/decoration-config";

type DecorationLayerProps = {
  seed: string;
  scale: number;
};

// Re-render interval. Doesn't need to be high — animations switch every 6s.
// 500ms is plenty for the switch to feel "instant".
const REFRESH_INTERVAL_MS = 500;

export function DecorationLayer({ seed, scale }: DecorationLayerProps) {
  const [now, setNow] = useState(() => Date.now());

  // Tick to drive animations. Only ticks if there's at least one animated asset placed.
  const hasAnimatedPlaced = DECORATION_SUB_ASSETS.some((sub) => {
    const placement = DECORATION_PLACEMENTS[sub.slotName];
    if (placement === null) return false;
    const kind = sub.variantBehavior.kind;
    return kind === "animated" || kind === "animated-column";
  });

  useEffect(() => {
    if (!hasAnimatedPlaced) return;
    const interval = setInterval(() => setNow(Date.now()), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [hasAnimatedPlaced]);

  const tilePx = TILE_SIZE * scale;

  return (
    <>
      {DECORATION_SUB_ASSETS.map((sub) => {
        const placement = DECORATION_PLACEMENTS[sub.slotName];
        if (placement === null || placement === undefined) return null;

        const atlas = DECORATION_ATLASES[sub.atlasKey];
        const variant = resolveSubAssetVariant(sub, seed, now);

        // Display dimensions on the scene grid
        const displayW = sub.tileWidth * tilePx;
        const displayH = sub.tileHeight * tilePx;

        // Atlas total displayed size, scaled to match tile size
        const scaleFactor = displayW / sub.widthPx; // pixels per atlas pixel
        const atlasDisplayW = atlas.atlasWidth * scaleFactor;
        const atlasDisplayH = atlas.atlasHeight * scaleFactor;

        return (
          <div
            key={sub.slotName}
            style={{
              position: "absolute",
              left: placement.tileX * tilePx,
              top: placement.tileY * tilePx,
              width: displayW,
              height: displayH,
              backgroundImage: `url(${atlas.path})`,
              backgroundPosition: `-${variant.atlasX * scaleFactor}px -${variant.atlasY * scaleFactor}px`,
              backgroundSize: `${atlasDisplayW}px ${atlasDisplayH}px`,
              backgroundRepeat: "no-repeat",
              imageRendering: "pixelated",
              pointerEvents: "none",
            }}
            aria-hidden
          />
        );
      })}
    </>
  );
}
```

---

## Step 4 — Integrate into `components/SceneRenderer.tsx`

Add the decoration layer after the pier layer. Render order (bottom to top): grass → pier → decorations.

In `SceneRenderer.tsx`, in the main render:

```tsx
import { DecorationLayer } from "@/components/DecorationLayer";

// ...

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
    {/* Grass layer */}
    {renderCellGrid(scene.cells, waveFrame, computedScale)}
    {/* Pier layer */}
    {renderCellGrid(scene.pierCells, waveFrame, computedScale)}
    {/* Decoration layer */}
    <DecorationLayer seed={scene.seed ?? "default"} scale={computedScale} />
  </div>
);
```

If `scene.seed` is null (handcrafted map case), fall back to "default" — this makes decoration variants deterministic across reloads.

---

## Step 5 — Verify

```bash
npm run lint
npm run build
npm run test:run
```

All must pass. Visit `/dev/scene`. With the default `decoration-config.ts` (all null), nothing decoration-related should render — confirm scene still works as before.

### Manual test

Edit `lib/scene/decoration-config.ts`:
1. Set `land1_0: { tileX: 1, tileY: 1 }` → save → refresh dev page → land1's first sub-asset appears in the top-left area of the top island.
2. Set `land4_0: { tileX: 1, tileY: 6 }` (somewhere visible) → wait 6 seconds → variant should switch between row 0 and row 1.
3. Set `land5_0: { tileX: 5, tileY: 2 }` → on first load, one of the two columns will be picked deterministically (try different `scene.seed` to see the other). Row animates every 6s.
4. Multiple sub-assets animated at once → confirm they switch at different times (phase offsets working).

---

## Acceptance criteria

- [ ] `lib/scene/decorations.ts` and `lib/scene/decoration-config.ts` created with the specified APIs.
- [ ] `components/DecorationLayer.tsx` created.
- [ ] `SceneRenderer.tsx` renders decoration layer over grass+pier.
- [ ] All sub-asset placements default to `null` — empty config does not change the scene.
- [ ] Manual test plan works: static placements render, animated placements switch every 6s, animated assets do NOT switch in lockstep (phase offsets visibly different).
- [ ] `npm run lint` clean.
- [ ] `npm run build` succeeds.
- [ ] `npm run test:run` green.
- [ ] No console errors.
- [ ] No additional dependencies installed.

---

## Non-goals

- ❌ No multi-placement of the same sub-asset.
- ❌ No collision/overlap checking — user is responsible for sensible placement.
- ❌ No fancy fade transitions between variants — instant swap is fine.
- ❌ No game-loop integration — just visual.
- ❌ Don't bundle the decoration timer with the grass wave timer; keep them separate.

---

## Wrap-up

- Suggested commit: `feat: add decoration layer with 5 land asset types`
- Brief response back: confirm Scene now has 3 layers, slot-config file location, default state is empty.
