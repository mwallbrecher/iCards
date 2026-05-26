import type { DecorationAssetEntry } from "./decorations";

/**
 * User-editable decoration entries.
 *
 * Export individual PNG files, then add one entry per placed asset.
 * - filePath is the main image file.
 * - tileX/tileY are 0-indexed scene-grid coordinates for the image's top-left.
 * - sizeMultiplier scales this one image after the scene scale is applied.
 * - change.kind controls variant selection:
 *   - "static": always render filePath.
 *   - "seed": pick filePath or one of otherFilePaths once per seed.
 *   - "runtime": cycle through filePath and otherFilePaths during play.
 *   - "wave": switch filePath/frame1FilePath with the tile wave frame.
 *   - "seed-wave": pick a seed variant, then switch its two water frames with the tile wave frame.
 */
export const DECORATION_ASSETS: DecorationAssetEntry[] = [
  // Entries are disabled until the matching individual PNG files exist.
  {
    id: "land-barrel",
    filePath: "/graphics/decorations/land/barrel/land-barrel-seed0.png",
    tileX: 9.8,
    tileY: 3,
    sizeMultiplier: 1,
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
    sizeMultiplier: 1,
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
    sizeMultiplier: 1,
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
    sizeMultiplier: 1,
    enabled: true,
    change: {
      kind: "runtime",
      otherFilePaths: ["/graphics/decorations/land/hut/land-hut-runtime1.png"],
    },
  },
  {
    id: "land-chest",
    filePath: "/graphics/decorations/land/chest/land-chest-0.png",
    tileX: 8.5,
    tileY: 11.8,
    sizeMultiplier: 1.25,
    enabled: true,
    change: {
      kind: "static",
    },
  },
  {
    id: "land-latern",
    filePath: "/graphics/decorations/land/latern/land-latern-seed0.png",
    tileX: 2,
    tileY: 10,
    sizeMultiplier: 1,
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
    sizeMultiplier: 1,
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
    sizeMultiplier: 1,
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
    sizeMultiplier: 1,
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
    sizeMultiplier: 1,
    enabled: false,
    change: {
      kind: "seed",
      otherFilePaths: ["/graphics/decorations/land/tree-big/land-tree-small-seed1.png", "/graphics/decorations/land/tree-big/land-tree-small-seed2.png"],
    },
  },

  // --- water decorations (wave-synced, disabled until placed) ---
  {
    id: "water-ball",
    filePath: "/graphics/decorations/water/ball/water-ball0.png",
    tileX: 10.7,
    tileY: 6.7,
    sizeMultiplier: 1,
    enabled: true,
    change: {
      kind: "wave",
      frame1FilePath: "/graphics/decorations/water/ball/water-ball1.png",
    },
  },
  {
    id: "water-barrel",
    filePath: "/graphics/decorations/water/barrel/water-barrel-seed0-0.png",
    tileX: 9.6,
    tileY: 14.5,
    sizeMultiplier: 1,
    enabled: true,
    change: {
      kind: "seed-wave",
      frame1FilePath:
        "/graphics/decorations/water/barrel/water-barrel-seed0-1.png",
      otherVariants: [
        {
          filePath:
            "/graphics/decorations/water/barrel/water-barrel-seed1-0.png",
          frame1FilePath:
            "/graphics/decorations/water/barrel/water-barrel-seed1-1.png",
        },
        {
          filePath:
            "/graphics/decorations/water/barrel/water-barrel-seed2-0.png",
          frame1FilePath:
            "/graphics/decorations/water/barrel/water-barrel-seed2-1.png",
        },
      ],
    },
  },
  {
    id: "water-latern",
    filePath: "/graphics/decorations/water/latern/water-letern-seed0-0.png",
    tileX: 4.1,
    tileY: 11.1,
    sizeMultiplier: 1,
    enabled: true,
    change: {
      kind: "seed-wave",
      frame1FilePath:
        "/graphics/decorations/water/latern/water-letern-seed0-1.png",
      otherVariants: [
        {
          filePath:
            "/graphics/decorations/water/latern/water-letern-seed1-0.png",
          frame1FilePath:
            "/graphics/decorations/water/latern/water-letern-seed1-1.png",
        },
        {
          filePath:
            "/graphics/decorations/water/latern/water-letern-seed2-0.png",
          frame1FilePath:
            "/graphics/decorations/water/latern/water-letern-seed2-1.png",
        },
      ],
    },
  },
  {
    id: "water-lillypad-clutter",
    filePath:
      "/graphics/decorations/water/lillypad-clutter/water-lillypad-clutter-0.png",
    tileX: 4.6,
    tileY: 3.9,
    sizeMultiplier: 1.15,
    enabled: true,
    change: {
      kind: "wave",
      frame1FilePath:
        "/graphics/decorations/water/lillypad-clutter/water-lillypad-clutter-1.png",
    },
  },
  {
    id: "water-lillypad-clutter1",
    filePath:
      "/graphics/decorations/water/lillypad-clutter/water-lillypad-clutter-0.png",
    tileX: 8.3,
    tileY: 9.9,
    sizeMultiplier: 1,
    enabled: true,
    change: {
      kind: "wave",
      frame1FilePath:
        "/graphics/decorations/water/lillypad-clutter/water-lillypad-clutter-1.png",
    },
  },
  {
    id: "water-plant",
    filePath: "/graphics/decorations/water/plant/water-plant-0.png",
    tileX: 9.2,
    tileY: 14.4,
    sizeMultiplier: 1,
    enabled: true,
    change: {
      kind: "wave",
      frame1FilePath: "/graphics/decorations/water/plant/water-plant-1.png",
    },
  },
  {
    id: "water-stick",
    filePath: "/graphics/decorations/water/stick/water-stick-seed0-0.png",
    tileX: 10.7,
    tileY: 14.4,
    sizeMultiplier: 1,
    enabled: true,
    change: {
      kind: "seed-wave",
      frame1FilePath:
        "/graphics/decorations/water/stick/water-stick-seed0-1.png",
      otherVariants: [
        {
          filePath:
            "/graphics/decorations/water/stick/water-stick-seed1-0.png",
          frame1FilePath:
            "/graphics/decorations/water/stick/water-stick-seed1-1.png",
        },
      ],
    },
  },
  {
    id: "water-stone-big",
    filePath:
      "/graphics/decorations/water/stone-big/water-stone-big-seed0-0.png",
    tileX: 1.3,
    tileY: 10.4,
    sizeMultiplier: 1,
    enabled: true,
    change: {
      kind: "seed-wave",
      frame1FilePath:
        "/graphics/decorations/water/stone-big/water-stone-big-seed0-1.png",
      otherVariants: [
        {
          filePath:
            "/graphics/decorations/water/stone-big/water-stone-big-seed1-0.png",
          frame1FilePath:
            "/graphics/decorations/water/stone-big/water-stone-big-seed1-1.png",
        },
      ],
    },
  },
  {
    id: "water-stone-big1",
    filePath:
      "/graphics/decorations/water/stone-big/water-stone-big-seed0-0.png",
    tileX: 4.9,
    tileY: 13.3,
    sizeMultiplier: 1.15,
    enabled: true,
    change: {
      kind: "seed-wave",
      frame1FilePath:
        "/graphics/decorations/water/stone-big/water-stone-big-seed0-1.png",
      otherVariants: [
        {
          filePath:
            "/graphics/decorations/water/stone-big/water-stone-big-seed1-0.png",
          frame1FilePath:
            "/graphics/decorations/water/stone-big/water-stone-big-seed1-1.png",
        },
      ],
    },
  },
  {
    id: "water-stone-small",
    filePath:
      "/graphics/decorations/water/stone-small/water-stone-small-0.png",
    tileX: 8,
    tileY: 4.3,
    sizeMultiplier: 1.15,
    enabled: true,
    change: {
      kind: "wave",
      frame1FilePath:
        "/graphics/decorations/water/stone-small/water-stone-small-1.png",
    },
  },
  {
    id: "water-stone-small1",
    filePath:
      "/graphics/decorations/water/stone-small/water-stone-small-0.png",
    tileX: 8.3,
    tileY: 4.8,
    sizeMultiplier: 0.9,
    enabled: true,
    change: {
      kind: "wave",
      frame1FilePath:
        "/graphics/decorations/water/stone-small/water-stone-small-1.png",
    },
  },
  {
    id: "water-tree",
    filePath: "/graphics/decorations/water/tree/water-tree-seed0-0.png",
    tileX: -1.2,
    tileY: 7.6,
    sizeMultiplier: 1.5,
    enabled: true,
    change: {
      kind: "seed-wave",
      frame1FilePath:
        "/graphics/decorations/water/tree/water-tree-seed0-1.png",
      otherVariants: [
        {
          filePath: "/graphics/decorations/water/tree/water-tree-seed1-0.png",
          frame1FilePath:
            "/graphics/decorations/water/tree/water-tree-seed1-1.png",
        },
        {
          filePath: "/graphics/decorations/water/tree/water-tree-seed2-0.png",
          frame1FilePath:
            "/graphics/decorations/water/tree/water-tree-seed2-1.png",
        },
      ],
    },
  },
  {
    id: "water-tree1",
    filePath: "/graphics/decorations/water/tree/water-tree-seed0-0.png",
    tileX: 8.9,
    tileY: 4.3,
    sizeMultiplier: 1,
    enabled: true,
    change: {
      kind: "seed-wave",
      frame1FilePath:
        "/graphics/decorations/water/tree/water-tree-seed0-1.png",
      otherVariants: [
        {
          filePath: "/graphics/decorations/water/tree/water-tree-seed1-0.png",
          frame1FilePath:
            "/graphics/decorations/water/tree/water-tree-seed1-1.png",
        },
        {
          filePath: "/graphics/decorations/water/tree/water-tree-seed2-0.png",
          frame1FilePath:
            "/graphics/decorations/water/tree/water-tree-seed2-1.png",
        },
      ],
    },
  },
  {
    id: "water-wood",
    filePath: "/graphics/decorations/water/wood/water-wood0.png",
    tileX: 3.9,
    tileY: 6.6,
    sizeMultiplier: 1,
    enabled: true,
    change: {
      kind: "wave",
      frame1FilePath: "/graphics/decorations/water/wood/water-wood1.png",
    },
  },
];
