import { describe, expect, test } from "vitest";
import { generateSceneFromMaps, parseMap } from "@/lib/scene/generator";
import {
  GRASS_DETAIL_1,
  GRASS_DETAIL_2,
  GRASS_DETAIL_3,
  GRASS_DETAIL_4,
  GRASS_DETAIL_5,
  GRASS_DETAIL_6,
  PIER1_MID_LEFT,
  PIER1_TOP_LEFT,
  PIER2_BOTTOM_RIGHT,
  PIER2_TOP_LEFT,
  TILE_GRASS_BOTTOM_LEFT,
  TILE_GRASS_BOTTOM_MID,
  TILE_GRASS_BOTTOM_RIGHT,
  TILE_GRASS_CENTER,
  TILE_GRASS_CORNER_TOP_LEFT,
  TILE_GRASS_CORNER_TOP_RIGHT,
  TILE_GRASS_LEFT_MID,
  TILE_GRASS_RIGHT_MID,
  TILE_GRASS_TOP_LEFT,
  TILE_GRASS_TOP_MID,
  TILE_GRASS_TOP_RIGHT,
  TILE_PIER1_TOP_LEFT_WAVE,
  TILE_PIER1_TOP_MID,
  TILE_PIER1_TOP_RIGHT_WAVE,
  TILE_PIER2_BOTTOM_LEFT_WAVE,
  TILE_PIER2_BOTTOM_RIGHT_WAVE,
  TILE_PIER2_TOP_LEFT_WAVE,
  TILE_PIER2_TOP_RIGHT_WAVE,
  TILE_PIER2_W_BOTTOM_MID,
  TILE_WATER_BOTTOM_LEFT,
  TILE_WATER_BOTTOM_MID,
  TILE_WATER_BOTTOM_RIGHT,
  TILE_WATER_CORNER_BOTTOM_LEFT,
  TILE_WATER_CORNER_BOTTOM_RIGHT,
  type TileCoord,
  type WaveAnimatedTile,
} from "@/lib/scene/tileset";

function staticTile(coord: TileCoord): WaveAnimatedTile {
  return { frame0: coord, frame1: coord };
}

describe("handcrafted scene parser", () => {
  test("maps the full tile alphabet literally", () => {
    const scene = parseMap(`
.C123456QTE
ADZBXWJKLR.
FG.........
`);

    expect(scene.cells[0]![0]!.tile).toBeNull();
    expect(scene.cells[0]![1]!.atlas).toBe("grass");
    expect(scene.cells[0]![1]!.tile).toEqual(TILE_GRASS_CENTER);
    expect(scene.cells[0]![2]!.tile).toEqual(staticTile(GRASS_DETAIL_1));
    expect(scene.cells[0]![3]!.tile).toEqual(staticTile(GRASS_DETAIL_2));
    expect(scene.cells[0]![4]!.tile).toEqual(staticTile(GRASS_DETAIL_3));
    expect(scene.cells[0]![5]!.tile).toEqual(staticTile(GRASS_DETAIL_4));
    expect(scene.cells[0]![6]!.tile).toEqual(staticTile(GRASS_DETAIL_5));
    expect(scene.cells[0]![7]!.tile).toEqual(staticTile(GRASS_DETAIL_6));
    expect(scene.cells[0]![8]!.tile).toEqual(TILE_GRASS_TOP_LEFT);
    expect(scene.cells[0]![9]!.tile).toEqual(TILE_GRASS_TOP_MID);
    expect(scene.cells[0]![10]!.tile).toEqual(TILE_GRASS_TOP_RIGHT);
    expect(scene.cells[1]![0]!.tile).toEqual(TILE_GRASS_LEFT_MID);
    expect(scene.cells[1]![1]!.tile).toEqual(TILE_GRASS_RIGHT_MID);
    expect(scene.cells[1]![2]!.tile).toEqual(TILE_GRASS_BOTTOM_LEFT);
    expect(scene.cells[1]![3]!.tile).toEqual(TILE_GRASS_BOTTOM_MID);
    expect(scene.cells[1]![4]!.tile).toEqual(TILE_GRASS_BOTTOM_RIGHT);
    expect(scene.cells[1]![5]!.tile).toEqual(TILE_WATER_BOTTOM_MID);
    expect(scene.cells[1]![6]!.tile).toEqual(TILE_WATER_CORNER_BOTTOM_LEFT);
    expect(scene.cells[1]![7]!.tile).toEqual(TILE_WATER_CORNER_BOTTOM_RIGHT);
    expect(scene.cells[1]![8]!.tile).toEqual(TILE_WATER_BOTTOM_LEFT);
    expect(scene.cells[1]![9]!.tile).toEqual(TILE_WATER_BOTTOM_RIGHT);
    expect(scene.cells[2]![0]!.tile).toEqual(TILE_GRASS_CORNER_TOP_LEFT);
    expect(scene.cells[2]![1]!.tile).toEqual(TILE_GRASS_CORNER_TOP_RIGHT);
    expect(scene.pierCells[0]![0]!.atlas).toBe("pier");
    expect(scene.pierCells[0]![0]!.tile).toBeNull();
    expect(scene.topIslandCoastline).toEqual([-1, -1, 1, 1, 1, 1, 1, 1, 1, 1, -1]);
    expect(scene.bottomIslandCoastline).toEqual([2, 2, -1, -1, -1, -1, -1, -1, 0, 0, 0]);
  });

  test("parses the pier overlay independently from the grass layer", () => {
    const scene = generateSceneFromMaps(
      `
..........
..........
..........
`,
      `
.abcfghijk
nopqrstuvw
xyz!@$&*(.
`,
    );

    expect(scene.cells[0]![1]!.tile).toBeNull();
    expect(scene.pierCells[0]![1]!.tile).toEqual(TILE_PIER1_TOP_LEFT_WAVE);
    expect(scene.pierCells[0]![2]!.tile).toEqual(TILE_PIER1_TOP_MID);
    expect(scene.pierCells[0]![3]!.tile).toEqual(TILE_PIER1_TOP_RIGHT_WAVE);
    expect(scene.pierCells[0]![4]!.tile).toEqual(staticTile(PIER1_MID_LEFT));
    expect(scene.pierCells[1]![0]!.tile).toEqual(staticTile(PIER1_TOP_LEFT));
    expect(scene.pierCells[1]![5]!.tile).toEqual(staticTile(PIER2_TOP_LEFT));
    expect(scene.pierCells[2]![3]!.tile).toEqual(staticTile(PIER2_BOTTOM_RIGHT));
    expect(scene.pierCells[2]![4]!.tile).toEqual(TILE_PIER2_TOP_LEFT_WAVE);
    expect(scene.pierCells[2]![5]!.tile).toEqual(TILE_PIER2_TOP_RIGHT_WAVE);
    expect(scene.pierCells[2]![6]!.tile).toEqual(TILE_PIER2_BOTTOM_LEFT_WAVE);
    expect(scene.pierCells[2]![7]!.tile).toEqual(TILE_PIER2_W_BOTTOM_MID);
    expect(scene.pierCells[2]![8]!.tile).toEqual(TILE_PIER2_BOTTOM_RIGHT_WAVE);
  });

  test("requires the pier map to match the grass map dimensions", () => {
    expect(() =>
      generateSceneFromMaps(
        `
..
..
`,
        `
..
`,
      ),
    ).toThrow("Pier map has 1 rows, expected 2 to match grass map.");
  });
});
