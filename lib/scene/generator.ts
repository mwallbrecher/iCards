import {
  GRASS_DETAIL_1,
  GRASS_DETAIL_2,
  GRASS_DETAIL_3,
  GRASS_DETAIL_4,
  GRASS_DETAIL_5,
  GRASS_DETAIL_6,
  PIER1_BOTTOM_LEFT,
  PIER1_BOTTOM_MID,
  PIER1_BOTTOM_RIGHT,
  PIER1_MID_CENTER,
  PIER1_MID_LEFT,
  PIER1_MID_RIGHT,
  PIER1_TOP_LEFT,
  PIER1_TOP_RIGHT,
  PIER2_BOTTOM_LEFT,
  PIER2_BOTTOM_MID,
  PIER2_BOTTOM_RIGHT,
  PIER2_MID_CENTER,
  PIER2_MID_LEFT,
  PIER2_MID_RIGHT,
  PIER2_TOP_LEFT,
  PIER2_TOP_MID,
  PIER2_TOP_RIGHT,
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
  TILE_PIER1_BOTTOM_LEFT_WAVE,
  TILE_PIER1_BOTTOM_RIGHT_WAVE,
  TILE_PIER1_TOP_LEFT_WAVE,
  TILE_PIER1_TOP_MID,
  TILE_PIER1_TOP_RIGHT_WAVE,
  TILE_PIER1_W_BOTTOM_MID,
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
} from "./tileset";
import type { GenerateSceneOptions, Scene, SceneCell } from "./types";

export const DEFAULT_MAP = `
CCCCCCCCCCCC
CCCCCCCCCCCC
CCCCCCCCCCCC
CCCCKWWWWJCC
CCCCD....ACC
CCCCD....LWW
WWWWR.......
............
............
............
............
............
..QTE.......
QTFCD.......
ACCCD.......
FCCCGTTTTE..
CCCCCCCCCGTT
CCCCCCCCCCCC
CCCCCCCCCCCC
CCCCCCCCCCCC
`;

export const DEFAULT_PIER_MAP = `
............
............
............
............
.stu........
.vwx........
.vwx........
.vwx........
.&*(........
............
............
............
........abbb
........fggg
........ijjj
............
............
............
............
............
`;

function staticTile(detail: TileCoord): WaveAnimatedTile {
  return { frame0: detail, frame1: detail };
}

function cellForChar(ch: string, row: number, col: number): SceneCell {
  switch (ch) {
    case ".":
      return { tile: null, atlas: "grass" };
    case "1":
      return { tile: staticTile(GRASS_DETAIL_1), atlas: "grass" };
    case "2":
      return { tile: staticTile(GRASS_DETAIL_2), atlas: "grass" };
    case "3":
      return { tile: staticTile(GRASS_DETAIL_3), atlas: "grass" };
    case "4":
      return { tile: staticTile(GRASS_DETAIL_4), atlas: "grass" };
    case "5":
      return { tile: staticTile(GRASS_DETAIL_5), atlas: "grass" };
    case "6":
      return { tile: staticTile(GRASS_DETAIL_6), atlas: "grass" };
    case "Q":
      return { tile: TILE_GRASS_TOP_LEFT, atlas: "grass" };
    case "C":
      return { tile: TILE_GRASS_CENTER, atlas: "grass" };
    case "E":
      return { tile: TILE_GRASS_TOP_RIGHT, atlas: "grass" };
    case "A":
      return { tile: TILE_GRASS_LEFT_MID, atlas: "grass" };
    case "D":
      return { tile: TILE_GRASS_RIGHT_MID, atlas: "grass" };
    case "Z":
      return { tile: TILE_GRASS_BOTTOM_LEFT, atlas: "grass" };
    case "B":
      return { tile: TILE_GRASS_BOTTOM_MID, atlas: "grass" };
    case "X":
      return { tile: TILE_GRASS_BOTTOM_RIGHT, atlas: "grass" };
    case "W":
      return { tile: TILE_WATER_BOTTOM_MID, atlas: "grass" };
    case "T":
      return { tile: TILE_GRASS_TOP_MID, atlas: "grass" };
    case "L":
      return { tile: TILE_WATER_BOTTOM_LEFT, atlas: "grass" };
    case "R":
      return { tile: TILE_WATER_BOTTOM_RIGHT, atlas: "grass" };
    case "J":
      return { tile: TILE_WATER_CORNER_BOTTOM_LEFT, atlas: "grass" };
    case "K":
      return { tile: TILE_WATER_CORNER_BOTTOM_RIGHT, atlas: "grass" };
    case "F":
      return { tile: TILE_GRASS_CORNER_TOP_LEFT, atlas: "grass" };
    case "G":
      return { tile: TILE_GRASS_CORNER_TOP_RIGHT, atlas: "grass" };
    default:
      throw new Error(
        `Unknown map character '${ch}' at row ${row}, col ${col}. Valid chars: . C 1 2 3 4 5 6 Q T E A D Z B X W J K L R F G`,
      );
  }
}

function parsePierChar(ch: string, row: number, col: number): SceneCell {
  switch (ch) {
    case ".":
      return { tile: null, atlas: "pier" };
    case "a":
      return { tile: TILE_PIER1_TOP_LEFT_WAVE, atlas: "pier" };
    case "b":
      return { tile: TILE_PIER1_TOP_MID, atlas: "pier" };
    case "c":
      return { tile: TILE_PIER1_TOP_RIGHT_WAVE, atlas: "pier" };
    case "f":
      return { tile: staticTile(PIER1_MID_LEFT), atlas: "pier" };
    case "g":
      return { tile: staticTile(PIER1_MID_CENTER), atlas: "pier" };
    case "h":
      return { tile: staticTile(PIER1_MID_RIGHT), atlas: "pier" };
    case "i":
      return { tile: TILE_PIER1_BOTTOM_LEFT_WAVE, atlas: "pier" };
    case "j":
      return { tile: TILE_PIER1_W_BOTTOM_MID, atlas: "pier" };
    case "k":
      return { tile: TILE_PIER1_BOTTOM_RIGHT_WAVE, atlas: "pier" };
    case "n":
      return { tile: staticTile(PIER1_TOP_LEFT), atlas: "pier" };
    case "o":
      return { tile: staticTile(PIER1_TOP_RIGHT), atlas: "pier" };
    case "p":
      return { tile: staticTile(PIER1_BOTTOM_LEFT), atlas: "pier" };
    case "q":
      return { tile: staticTile(PIER1_BOTTOM_MID), atlas: "pier" };
    case "r":
      return { tile: staticTile(PIER1_BOTTOM_RIGHT), atlas: "pier" };
    case "s":
      return { tile: staticTile(PIER2_TOP_LEFT), atlas: "pier" };
    case "t":
      return { tile: staticTile(PIER2_TOP_MID), atlas: "pier" };
    case "u":
      return { tile: staticTile(PIER2_TOP_RIGHT), atlas: "pier" };
    case "v":
      return { tile: staticTile(PIER2_MID_LEFT), atlas: "pier" };
    case "w":
      return { tile: staticTile(PIER2_MID_CENTER), atlas: "pier" };
    case "x":
      return { tile: staticTile(PIER2_MID_RIGHT), atlas: "pier" };
    case "y":
      return { tile: staticTile(PIER2_BOTTOM_LEFT), atlas: "pier" };
    case "z":
      return { tile: staticTile(PIER2_BOTTOM_MID), atlas: "pier" };
    case "!":
      return { tile: staticTile(PIER2_BOTTOM_RIGHT), atlas: "pier" };
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
        `Unknown pier-map character '${ch}' at row ${row}, col ${col}. Valid chars: . a b c f g h i j k n o p q r s t u v w x y z ! @ $ & * (`,
      );
  }
}

function isTopCoastlineChar(ch: string): boolean {
  return (
    ch === "Z" ||
    ch === "B" ||
    ch === "X" ||
    ch === "W" ||
    ch === "L" ||
    ch === "R" ||
    ch === "J" ||
    ch === "K"
  );
}

function isBottomCoastlineChar(ch: string): boolean {
  return ch === "Q" || ch === "T" || ch === "E" || ch === "F" || ch === "G";
}

function createEmptyPierCells(width: number, height: number): SceneCell[][] {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({ tile: null, atlas: "pier" })),
  );
}

export function parsePierMap(
  mapString: string,
  expectedWidth: number,
  expectedHeight: number,
): SceneCell[][] {
  const lines = mapString
    .split("\n")
    .map((line) => line.trim())
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

export function parseMap(mapString: string): Scene {
  const lines = mapString
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    throw new Error("Map is empty");
  }

  const height = lines.length;
  const width = lines[0]!.length;

  for (let row = 0; row < height; row++) {
    const rowWidth = lines[row]!.length;

    if (rowWidth !== width) {
      throw new Error(
        `Row ${row} has width ${rowWidth}, expected ${width}. All rows must have the same number of characters.`,
      );
    }

    for (let col = 0; col < rowWidth; col++) {
      cellForChar(lines[row]![col]!, row, col);
    }
  }

  const topIslandCoastline = new Array<number>(width).fill(-1);
  const bottomIslandCoastline = new Array<number>(width).fill(-1);

  for (let col = 0; col < width; col++) {
    for (let row = 0; row < height; row++) {
      const ch = lines[row]![col]!;

      if (isTopCoastlineChar(ch)) {
        topIslandCoastline[col] = row;
      }

      if (isBottomCoastlineChar(ch) && bottomIslandCoastline[col] === -1) {
        bottomIslandCoastline[col] = row;
      }
    }
  }

  const cells: SceneCell[][] = [];

  for (let row = 0; row < height; row++) {
    const rowCells: SceneCell[] = [];

    for (let col = 0; col < width; col++) {
      const ch = lines[row]![col]!;
      rowCells.push(cellForChar(ch, row, col));
    }

    cells.push(rowCells);
  }

  return {
    width,
    height,
    cells,
    pierCells: createEmptyPierCells(width, height),
    topIslandCoastline,
    bottomIslandCoastline,
    seed: null,
  };
}

export function generateSceneFromMaps(
  grassMap: string,
  pierMap: string,
  seed: string | null = null,
): Scene {
  const grassScene = parseMap(grassMap);
  const pierCells = parsePierMap(
    pierMap,
    grassScene.width,
    grassScene.height,
  );

  return {
    ...grassScene,
    pierCells,
    seed,
  };
}

export function generateScene(
  _seed: string = "default",
  _opts: GenerateSceneOptions = {},
): Scene {
  void _opts;
  return generateSceneFromMaps(DEFAULT_MAP, DEFAULT_PIER_MAP, _seed);
}
