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
    id: "land1_0",
    filePath: "/graphics/decorations/land1_0-a.png",
    tileX: 2,
    tileY: 3,
    enabled: false,
    change: {
      kind: "seed",
      otherFilePaths: ["/graphics/decorations/land1_0-b.png"],
    },
  },
  {
    id: "land1_1",
    filePath: "/graphics/decorations/land1_1-a.png",
    tileX: 3,
    tileY: 4,
    enabled: false,
    change: {
      kind: "seed",
      otherFilePaths: ["/graphics/decorations/land1_1-b.png"],
    },
  },
  {
    id: "land1_2",
    filePath: "/graphics/decorations/land1_2-a.png",
    tileX: 9.5,
    tileY: 3,
    enabled: false,
    change: {
      kind: "seed",
      otherFilePaths: ["/graphics/decorations/land1_2-b.png"],
    },
  },
  {
    id: "land1_3",
    filePath: "/graphics/decorations/land1_3-a.png",
    tileX: 2,
    tileY: 10,
    enabled: false,
    change: {
      kind: "seed",
      otherFilePaths: ["/graphics/decorations/land1_3-b.png"],
    },
  },
  {
    id: "land2_0",
    filePath: "/graphics/decorations/land2_0-a.png",
    tileX: 2,
    tileY: 10,
    enabled: false,
    change: {
      kind: "seed",
      otherFilePaths: ["/graphics/decorations/land2_0-b.png"],
    },
  },
  {
    id: "land2_1",
    filePath: "/graphics/decorations/land2_1-a.png",
    tileX: 2,
    tileY: 10,
    enabled: false,
    change: {
      kind: "seed",
      otherFilePaths: ["/graphics/decorations/land2_1-b.png"],
    },
  },
  {
    id: "land3_0",
    filePath: "/graphics/decorations/land3_0-a.png",
    tileX: 0,
    tileY: 0,
    enabled: false,
    change: {
      kind: "seed",
      otherFilePaths: ["/graphics/decorations/land3_0-b.png"],
    },
  },
  {
    id: "land4_0",
    filePath: "/graphics/decorations/land4_0-a.png",
    tileX: 4,
    tileY: 1,
    enabled: false,
    change: {
      kind: "seed",
      otherFilePaths: [
        "/graphics/decorations/land4_0-b.png",
        "/graphics/decorations/land4_0-c.png",
      ],
    },
  },
  {
    id: "land5_0",
    filePath: "/graphics/decorations/land5_0-frame0.png",
    tileX: 9,
    tileY: 0,
    enabled: false,
    change: {
      kind: "runtime",
      otherFilePaths: ["/graphics/decorations/land5_0-frame1.png"],
    },
  },
];
