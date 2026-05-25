// lib/scene/tileset.ts

/**
 * Tileset mapping for the swamp tilemap.
 *
 * Atlas: public/graphics/tilemap/grass_maptile.png
 * Tile size: 16x16 source pixels
 * Atlas dimensions: 5 columns × 11 rows
 *
 * Conventions:
 * - `top/bottom/left/right` describe the tile from the ISLAND's perspective
 *   (top = away from water, bottom = facing water in Stardew-like view).
 * - `water0` / `water1` are wave-animation frames (300ms toggle).
 *   Only tiles with water contact have these.
 * - `corner-X-Y` describes an INNER corner where the X-Y corner of the tile
 *   shows water cutting into the island. E.g. `corner-bottom-right`:
 *   the bottom-right pixel corner is water, the rest is island.
 */

export const TILESET_PATH = "/graphics/tilemap/grass_maptile.png";
export const TILE_SIZE = 16;
export const ATLAS_COLS = 5;
export const ATLAS_ROWS = 11;

export type TileCoord = { col: number; row: number };

// Row 0 (physically row 1 in your description)
export const GRASS_DETAIL_1: TileCoord = { col: 0, row: 0 };
export const GRASS_DETAIL_2: TileCoord = { col: 1, row: 0 };
export const GRASS_TILE_TOP_LEFT: TileCoord = { col: 2, row: 0 };
export const GRASS_TILE_TOP_MID: TileCoord = { col: 3, row: 0 };
export const GRASS_TILE_TOP_RIGHT: TileCoord = { col: 4, row: 0 };

// Row 1 (physically row 2)
export const GRASS_DETAIL_3: TileCoord = { col: 0, row: 1 };
export const GRASS_DETAIL_4: TileCoord = { col: 1, row: 1 };
export const GRASS_TILE_LEFT_MID: TileCoord = { col: 2, row: 1 };
export const GRASS_TILE_CENTER: TileCoord = { col: 3, row: 1 };
export const GRASS_TILE_RIGHT_MID: TileCoord = { col: 4, row: 1 };

// Row 2 (physically row 3)
export const GRASS_DETAIL_5: TileCoord = { col: 0, row: 2 };
export const GRASS_DETAIL_6: TileCoord = { col: 1, row: 2 };
export const GRASS_TILE_BOTTOM_LEFT: TileCoord = { col: 2, row: 2 };
export const GRASS_TILE_BOTTOM_MID: TileCoord = { col: 3, row: 2 };
export const GRASS_TILE_BOTTOM_RIGHT: TileCoord = { col: 4, row: 2 };

// Rows 3-6 (physically rows 4-7) — NOT YET MAPPED, set to null for now

// Row 7 (physically row 8) — bottom coastline, wave frame 0, with corners
// Note: col 0 and col 1 are "none" / unused
export const GRASS_WATER0_CORNER_BOTTOM_RIGHT: TileCoord = { col: 2, row: 7 };
export const GRASS_WATER0_BOTTOM_MID: TileCoord = { col: 3, row: 7 };
export const GRASS_WATER0_CORNER_BOTTOM_LEFT: TileCoord = { col: 4, row: 7 };

// Row 8 (physically row 9) — bottom-left/right edges, wave frame 0
// Note: cols 2-4 are "none" / unused (only 2 tiles in this row)
export const GRASS_WATER0_BOTTOM_LEFT: TileCoord = { col: 0, row: 8 };
export const GRASS_WATER0_BOTTOM_RIGHT: TileCoord = { col: 1, row: 8 };

// Row 9 (physically row 10) — wave frame 1 bottom edges + top inner corners
export const GRASS_WATER1_BOTTOM_LEFT: TileCoord = { col: 0, row: 9 };
export const GRASS_WATER1_BOTTOM_RIGHT: TileCoord = { col: 1, row: 9 };
export const GRASS_CORNER_TOP_RIGHT: TileCoord = { col: 2, row: 9 };
// col 3 is "none"
export const GRASS_CORNER_TOP_LEFT: TileCoord = { col: 4, row: 9 };

// Row 10 (physically row 11) — bottom coastline, wave frame 1, with corners
// Note: col 0 and col 1 are "none"
export const GRASS_WATER1_CORNER_BOTTOM_RIGHT: TileCoord = { col: 2, row: 10 };
export const GRASS_WATER1_BOTTOM_MID: TileCoord = { col: 3, row: 10 };
export const GRASS_WATER1_CORNER_BOTTOM_LEFT: TileCoord = { col: 4, row: 10 };

// ------- Higher-level groupings ----------

/**
 * Maps a base tile (e.g. BOTTOM_MID) to its two wave-animation frames.
 * For tiles without wave animation, both frames are the same tile.
 */
export type WaveAnimatedTile = {
    frame0: TileCoord;
    frame1: TileCoord;
};

export const TILE_WATER_BOTTOM_MID: WaveAnimatedTile = {
    frame0: GRASS_WATER0_BOTTOM_MID,
    frame1: GRASS_WATER1_BOTTOM_MID,
};

export const TILE_WATER_BOTTOM_LEFT: WaveAnimatedTile = {
    frame0: GRASS_WATER0_BOTTOM_LEFT,
    frame1: GRASS_WATER1_BOTTOM_LEFT,
};

export const TILE_WATER_BOTTOM_RIGHT: WaveAnimatedTile = {
    frame0: GRASS_WATER0_BOTTOM_RIGHT,
    frame1: GRASS_WATER1_BOTTOM_RIGHT,
};

export const TILE_WATER_CORNER_BOTTOM_LEFT: WaveAnimatedTile = {
    frame0: GRASS_WATER0_CORNER_BOTTOM_LEFT,
    frame1: GRASS_WATER1_CORNER_BOTTOM_LEFT,
};

export const TILE_WATER_CORNER_BOTTOM_RIGHT: WaveAnimatedTile = {
    frame0: GRASS_WATER0_CORNER_BOTTOM_RIGHT,
    frame1: GRASS_WATER1_CORNER_BOTTOM_RIGHT,
};

// Non-animated tiles (same for both frames)
function staticTile(coord: TileCoord): WaveAnimatedTile {
    return { frame0: coord, frame1: coord };
}

export const TILE_GRASS_TOP_LEFT = staticTile(GRASS_TILE_TOP_LEFT);
export const TILE_GRASS_TOP_MID = staticTile(GRASS_TILE_TOP_MID);
export const TILE_GRASS_TOP_RIGHT = staticTile(GRASS_TILE_TOP_RIGHT);
export const TILE_GRASS_LEFT_MID = staticTile(GRASS_TILE_LEFT_MID);
export const TILE_GRASS_CENTER = staticTile(GRASS_TILE_CENTER);
export const TILE_GRASS_RIGHT_MID = staticTile(GRASS_TILE_RIGHT_MID);
export const TILE_GRASS_BOTTOM_LEFT = staticTile(GRASS_TILE_BOTTOM_LEFT);
export const TILE_GRASS_BOTTOM_MID = staticTile(GRASS_TILE_BOTTOM_MID);
export const TILE_GRASS_BOTTOM_RIGHT = staticTile(GRASS_TILE_BOTTOM_RIGHT);

export const TILE_GRASS_CORNER_TOP_LEFT = staticTile(GRASS_CORNER_TOP_LEFT);
export const TILE_GRASS_CORNER_TOP_RIGHT = staticTile(GRASS_CORNER_TOP_RIGHT);

// Grass detail tiles for variation (sprinkled on plain ground)
export const GRASS_DETAIL_TILES: TileCoord[] = [
    GRASS_DETAIL_1,
    GRASS_DETAIL_2,
    GRASS_DETAIL_3,
    GRASS_DETAIL_4,
    GRASS_DETAIL_5,
    GRASS_DETAIL_6,
];

// Water background color (the teal/green water shade visible in the screenshots)
// This is the page background; water tiles are transparent over it.
// Adjust if your screenshot shows a different exact shade.
export const WATER_BACKGROUND_COLOR = "#43A38D";

// ============================================================
// Pier tileset: public/graphics/tilemap/pier_maptile.png
// ============================================================

export const PIER_TILESET_PATH = "/graphics/tilemap/pier_maptile.png";
export const PIER_ATLAS_COLS = 6;
export const PIER_ATLAS_ROWS = 9;

// Pier1 (vertical pier): water-edge wave frames and body tiles.
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

export const PIER1_TOP_LEFT: TileCoord = { col: 0, row: 3 };
export const PIER1_TOP_RIGHT: TileCoord = { col: 2, row: 3 };
export const PIER1_BOTTOM_LEFT: TileCoord = { col: 0, row: 5 };
export const PIER1_BOTTOM_MID: TileCoord = { col: 1, row: 5 };
export const PIER1_BOTTOM_RIGHT: TileCoord = { col: 2, row: 5 };

// Pier2 (horizontal pier): body tiles and water-edge wave frames.
export const PIER2_TOP_LEFT: TileCoord = { col: 3, row: 3 };
export const PIER2_TOP_MID: TileCoord = { col: 4, row: 3 };
export const PIER2_TOP_RIGHT: TileCoord = { col: 5, row: 3 };
export const PIER2_MID_LEFT: TileCoord = { col: 3, row: 4 };
export const PIER2_MID_CENTER: TileCoord = { col: 4, row: 4 };
export const PIER2_MID_RIGHT: TileCoord = { col: 5, row: 4 };
export const PIER2_BOTTOM_LEFT: TileCoord = { col: 3, row: 5 };
export const PIER2_BOTTOM_MID: TileCoord = { col: 4, row: 5 };
export const PIER2_BOTTOM_RIGHT: TileCoord = { col: 5, row: 5 };

export const PIER2_W0_TOP_LEFT: TileCoord = { col: 0, row: 6 };
export const PIER2_W0_TOP_RIGHT: TileCoord = { col: 2, row: 6 };
export const PIER2_W1_TOP_LEFT: TileCoord = { col: 3, row: 6 };
export const PIER2_W1_TOP_RIGHT: TileCoord = { col: 5, row: 6 };

export const PIER2_W0_BOTTOM_LEFT: TileCoord = { col: 0, row: 8 };
export const PIER2_W_BOTTOM_MID: TileCoord = { col: 1, row: 8 };
export const PIER2_W0_BOTTOM_RIGHT: TileCoord = { col: 2, row: 8 };
export const PIER2_W1_BOTTOM_LEFT: TileCoord = { col: 3, row: 8 };
export const PIER2_W1_BOTTOM_RIGHT: TileCoord = { col: 5, row: 8 };

export const TILE_PIER1_TOP_LEFT_WAVE: WaveAnimatedTile = {
    frame0: PIER1_W0_TOP_LEFT,
    frame1: PIER1_W1_TOP_LEFT,
};

export const TILE_PIER1_TOP_MID = staticTile(PIER1_TOP_MID);

export const TILE_PIER1_TOP_RIGHT_WAVE: WaveAnimatedTile = {
    frame0: PIER1_W0_TOP_RIGHT,
    frame1: PIER1_W1_TOP_RIGHT,
};

export const TILE_PIER1_BOTTOM_LEFT_WAVE: WaveAnimatedTile = {
    frame0: PIER1_W0_BOTTOM_LEFT,
    frame1: PIER1_W1_BOTTOM_LEFT,
};

export const TILE_PIER1_W_BOTTOM_MID = staticTile(PIER1_W_BOTTOM_MID);

export const TILE_PIER1_BOTTOM_RIGHT_WAVE: WaveAnimatedTile = {
    frame0: PIER1_W0_BOTTOM_RIGHT,
    frame1: PIER1_W1_BOTTOM_RIGHT,
};

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

export const TILE_PIER2_W_BOTTOM_MID = staticTile(PIER2_W_BOTTOM_MID);

export const TILE_PIER2_BOTTOM_RIGHT_WAVE: WaveAnimatedTile = {
    frame0: PIER2_W0_BOTTOM_RIGHT,
    frame1: PIER2_W1_BOTTOM_RIGHT,
};
