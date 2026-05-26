import type { DecorationAssetEntry } from "./decorations";

/**
 * User-editable decoration entries.
 *
 * Export individual PNG files, then add one entry per placed asset.
 * - filePath is the main image file.
 * - tileX/tileY are 0-indexed scene-grid coordinates for the image's top-left.
 * - change.kind controls variant selection:
 *   - "static": always render filePath.
 *   - "seed": pick filePath or one of otherFilePaths once per seed.
 *   - "runtime": cycle through filePath and otherFilePaths during play.
 */
export const DECORATION_ASSETS: DecorationAssetEntry[] = [
  // Entries are disabled until the matching individual PNG files exist.
  {
    id: "land-barrel",
    filePath: "/graphics/decorations/land/barrel/land-barrel-seed0.png",
    tileX: 9.8,
    tileY: 3,
    enabled: true,
    change: {
      kind: "seed",
      otherFilePaths: ["/graphics/decorations/land/barrel/land-barrel-seed1.png", "/graphics/decorations/land/barrel/land-barrel-seed2.png"],
    },
  },
  {
    id: "land-fountain1",
    filePath: "/graphics/decorations/land/fountain/land-fountain1-runtime0.png",
    tileX: 9,
    tileY: 0.2,
    enabled: true,
    change: {
      kind: "runtime",
      otherFilePaths: ["/graphics/decorations/land/fountain/land-fountain1-runtime1.png"],
    },
  },
  {
    id: "land-fountain2",
    filePath: "/graphics/decorations/land/fountain/land-fountain2-runtime0.png",
    tileX: 2,
    tileY: 10,
    enabled: false,
    change: {
      kind: "runtime",
      otherFilePaths: ["/graphics/decorations/land/fountain/land-fountain2-runtime1.png"],
    },
  },
  {
    id: "land-hut",
    filePath: "/graphics/decorations/land/hut/land-hut-runtime0.png",
    tileX: 0.3,
    tileY: 0.1,
    enabled: true,
    change: {
      kind: "runtime",
      otherFilePaths: ["/graphics/decorations/land/hut/land-hut-runtime1.png"],
    },
  },
  {
    id: "land-latern",
    filePath: "/graphics/decorations/land/latern/land-latern-seed0.png",
    tileX: 2,
    tileY: 10,
    enabled: false,
    change: {
      kind: "seed",
      otherFilePaths: ["/graphics/decorations/land/latern/land-latern-seed1.png", "/graphics/decorations/land/latern/land-latern-seed2.png"],
    },
  },
  {
    id: "land-stone",
    filePath: "/graphics/decorations/land/stone/land-stone-seed0.png",
    tileX: 0,
    tileY: 0,
    enabled: false,
    change: {
      kind: "seed",
      otherFilePaths: ["/graphics/decorations/land/stone/land-stone-seed1.png"],
    },
  },
  {
    id: "land-stumb",
    filePath: "/graphics/decorations/land/stumb/land-tree-stumb1-runtime-0.png",
    tileX: 4,
    tileY: 1,
    enabled: false,
    change: {
      kind: "runtime",
      otherFilePaths: [
        "/graphics/decorations/land/stumb/land-tree-stumb1-runtime-1.png",
      ],
    },
  },
  {
    id: "land-tree-big",
    filePath: "/graphics/decorations/land/tree-big/land-tree-big-seed0.png",
    tileX: 9,
    tileY: 0,
    enabled: false,
    change: {
      kind: "seed",
      otherFilePaths: ["/graphics/decorations/land/tree-big/land-tree-big-seed1.png", "/graphics/decorations/land/tree-big/land-tree-big-seed2.png"],
    },
  },
  {
    id: "land-tree-small",
    filePath: "/graphics/decorations/land/tree-big/land-tree-small-seed0.png",
    tileX: 9,
    tileY: 0,
    enabled: false,
    change: {
      kind: "seed",
      otherFilePaths: ["/graphics/decorations/land/tree-big/land-tree-small-seed1.png", "/graphics/decorations/land/tree-big/land-tree-small-seed2.png"],
    },
  },
];
