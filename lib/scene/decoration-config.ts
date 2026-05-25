/**
 * User-editable decoration placement config.
 *
 * Coordinates are 0-indexed tile coordinates on the scene grid and point to the
 * asset's top-left corner. Set a slot to null to keep it off-screen.
 */

export type Placement = { tileX: number; tileY: number };

export const DECORATION_PLACEMENTS: Record<string, Placement | null> = {
  // land1: 64px tall, static row variant per game.
  land1_0: { tileX: 2, tileY: 3 }, // 3 tiles wide, 2 tiles tall
  land1_1: { tileX: 3, tileY: 4 }, // 2 tiles wide, 2 tiles tall
  land1_2: { tileX: 9.5, tileY: 3 }, // 2 tiles wide, 2 tiles tall
  land1_3: { tileX: 2, tileY: 10 }, // 1 tile wide, 2 tiles tall

  // land2: 96px tall, static row variant per game.
  land2_0: { tileX: 2, tileY: 10 }, // 4 tiles wide, 3 tiles tall
  land2_1: { tileX: 2, tileY: 10 }, // 4 tiles wide, 3 tiles tall

  // land3: 192px tall, static row variant per game.
  land3_0: null, // 5 tiles wide, 6 tiles tall

  // land4: 64px tall, static column variant per game.
  land4_0: { tileX: 4, tileY: 1 }, // 3 tiles wide, 4 tiles tall

  // land5: 96px tall, static column variant and animated row variant.
  land5_0: { tileX: 9, tileY: 0 }, // 2 tiles wide, 3 tiles tall
};
