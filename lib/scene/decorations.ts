export type DecorationAtlasKey =
  | "land1"
  | "land2"
  | "land3"
  | "land4"
  | "land5";

export type DecorationAtlas = {
  /** Path to the PNG. */
  path: string;
  /** Total atlas width in pixels. */
  atlasWidth: number;
  /** Total atlas height in pixels. */
  atlasHeight: number;
  /** Height of one variant row, in pixels. */
  rowHeight: number;
};

export type DecorationSubAsset = {
  /** Identifier used in the placement config and phase offset hashing. */
  slotName: string;
  /** Display name for diagnostics. */
  label: string;
  /** Atlas this sub-asset comes from. */
  atlasKey: DecorationAtlasKey;
  /** X offset in atlas pixels for this sub-asset. */
  xPx: number;
  /** Width of this sub-asset in atlas pixels. */
  widthPx: number;
  /** Height of this sub-asset in atlas pixels. */
  heightPx: number;
  /** Display size on the scene grid, in tiles. */
  tileWidth: number;
  tileHeight: number;
  /** Behavior of variant selection. */
  variantBehavior:
  | { kind: "static" }
  | { kind: "animated" }
  | { kind: "animated-column"; columnCount: number }
  | { kind: "static-column"; columnCount: number };
};

export const ANIMATION_PERIOD_MS = 6000;

export const DECORATION_ATLASES: Record<
  DecorationAtlasKey,
  DecorationAtlas
> = {
  land1: {
    path: "/graphics/decorations/land-1-rh2.png",
    atlasWidth: 128,
    atlasHeight: 64,
    rowHeight: 32,
  },
  land2: {
    path: "/graphics/decorations/land-2-rh3.png",
    atlasWidth: 128,
    atlasHeight: 96,
    rowHeight: 48,
  },
  land3: {
    path: "/graphics/decorations/land-3-rh6.png",
    atlasWidth: 80,
    atlasHeight: 192,
    rowHeight: 96,
  },
  land4: {
    path: "/graphics/decorations/land-4-rh4.png",
    atlasWidth: 144,
    atlasHeight: 64,
    rowHeight: 64,
  },
  land5: {
    path: "/graphics/decorations/land-5-rh3.png",
    atlasWidth: 64,
    atlasHeight: 96,
    rowHeight: 48,
  },
};

const TILE_PX = 16;

export const DECORATION_SUB_ASSETS: DecorationSubAsset[] = [
  {
    slotName: "land1_0",
    label: "land1 asset 0",
    atlasKey: "land1",
    xPx: 0,
    widthPx: 48,
    heightPx: 32,
    tileWidth: 48 / TILE_PX,
    tileHeight: 32 / TILE_PX,
    variantBehavior: { kind: "static" },
  },
  {
    slotName: "land1_1",
    label: "land1 asset 1",
    atlasKey: "land1",
    xPx: 48,
    widthPx: 32,
    heightPx: 32,
    tileWidth: 2,
    tileHeight: 2,
    variantBehavior: { kind: "static" },
  },
  {
    slotName: "land1_2",
    label: "land1 asset 2",
    atlasKey: "land1",
    xPx: 80,
    widthPx: 32,
    heightPx: 32,
    tileWidth: 2,
    tileHeight: 2,
    variantBehavior: { kind: "static" },
  },
  {
    slotName: "land1_3",
    label: "land1 asset 3",
    atlasKey: "land1",
    xPx: 112,
    widthPx: 16,
    heightPx: 32,
    tileWidth: 1,
    tileHeight: 2,
    variantBehavior: { kind: "static" },
  },
  {
    slotName: "land2_0",
    label: "land2 asset 0",
    atlasKey: "land2",
    xPx: 0,
    widthPx: 64,
    heightPx: 48,
    tileWidth: 4,
    tileHeight: 3,
    variantBehavior: { kind: "static" },
  },
  {
    slotName: "land2_1",
    label: "land2 asset 1",
    atlasKey: "land2",
    xPx: 64,
    widthPx: 64,
    heightPx: 48,
    tileWidth: 4,
    tileHeight: 3,
    variantBehavior: { kind: "static" },
  },
  {
    slotName: "land3_0",
    label: "land3 asset 0",
    atlasKey: "land3",
    xPx: 0,
    widthPx: 80,
    heightPx: 96,
    tileWidth: 5,
    tileHeight: 6,
    variantBehavior: { kind: "static" },
  },
  {
    slotName: "land4_0",
    label: "land4 asset 0 (static-column, 3 variants)",
    atlasKey: "land4",
    xPx: 0,
    widthPx: 48,
    heightPx: 64,
    tileWidth: 3,
    tileHeight: 4,
    variantBehavior: { kind: "static-column", columnCount: 3 },
  },
  {
    slotName: "land5_0",
    label: "land5 asset 0",
    atlasKey: "land5",
    xPx: 0,
    widthPx: 32,
    heightPx: 48,
    tileWidth: 2,
    tileHeight: 3,
    variantBehavior: { kind: "animated-column", columnCount: 2 },
  },
];

export function hashStringToNumber(value: string): number {
  let hash = 2166136261 >>> 0;

  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function resolveSubAssetVariant(
  subAsset: DecorationSubAsset,
  seed: string,
  nowMs: number,
): { atlasX: number; atlasY: number } {
  const atlas = DECORATION_ATLASES[subAsset.atlasKey];

  switch (subAsset.variantBehavior.kind) {
    case "static": {
      const hash = hashStringToNumber(`${seed}:${subAsset.slotName}`);
      const row = hash % 2;
      return { atlasX: subAsset.xPx, atlasY: row * atlas.rowHeight };
    }
    case "animated": {
      const phaseOffset =
        hashStringToNumber(`${subAsset.slotName}:phase`) %
        ANIMATION_PERIOD_MS;
      const slot = Math.floor((nowMs + phaseOffset) / ANIMATION_PERIOD_MS);
      const row = slot % 2;
      return { atlasX: subAsset.xPx, atlasY: row * atlas.rowHeight };
    }
    case "animated-column": {
      const colHash = hashStringToNumber(`${seed}:${subAsset.slotName}:col`);
      const col = colHash % subAsset.variantBehavior.columnCount;
      const phaseOffset =
        hashStringToNumber(`${subAsset.slotName}:phase`) %
        ANIMATION_PERIOD_MS;
      const slot = Math.floor((nowMs + phaseOffset) / ANIMATION_PERIOD_MS);
      const row = slot % 2;

      return {
        atlasX: col * subAsset.widthPx,
        atlasY: row * atlas.rowHeight,
      };
    }
    case "static-column": {
      const colHash = hashStringToNumber(`${seed}:${subAsset.slotName}:col`);
      const col = colHash % subAsset.variantBehavior.columnCount;

      return {
        atlasX: col * subAsset.widthPx,
        atlasY: 0,
      };
    }
  }
}
