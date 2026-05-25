import type { WaveAnimatedTile } from "./tileset";

export type AtlasName = "grass" | "pier";

export type SceneCell = {
  /** The tile to render at this position. null means pure water. */
  tile: WaveAnimatedTile | null;
  /** Which atlas this cell's tile coordinates reference. */
  atlas: AtlasName;
  /** Optional detail drawn over the base tile. */
  detailTile?: WaveAnimatedTile;
};

export type Scene = {
  width: number;
  height: number;
  /** Cells are stored row-first: cells[row][col]. */
  cells: SceneCell[][];
  /** Pier overlay cells, stored row-first and rendered above the grass layer. */
  pierCells: SceneCell[][];
  /** Per-column row index where the opponent island ends. */
  topIslandCoastline: number[];
  /** Per-column row index where the viewer island begins. */
  bottomIslandCoastline: number[];
  /** The seed used to generate this scene, or null for handcrafted maps. */
  seed: string | null;
};

export type GenerateSceneOptions = {
  width?: number;
  height?: number;
  /** Density of grass detail tiles on land (0-1). Default 0.2. */
  detailDensity?: number;
};
