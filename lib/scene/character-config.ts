export type SceneCharacterDirection = "left" | "right";
export type SceneCharacterId = "player" | "opponent";

export type SceneCharacterPlacement = {
  enabled: boolean;
  /** Top-left coordinate on the scene grid, in tiles. Fractional values are allowed. */
  tileX: number;
  tileY: number;
  /** Visual facing direction. "left" mirrors the sprite with CSS. */
  direction: SceneCharacterDirection;
};

export const SCENE_CHARACTER_PLACEMENTS: Record<
  SceneCharacterId,
  SceneCharacterPlacement
> = {
  player: {
    enabled: true,
    tileX: 7.1,
    tileY: 12.2,
    direction: "left",
  },
  opponent: {
    enabled: true,
    tileX: 2,
    tileY: 5.8,
    direction: "right",
  },
};

export const PLAYER_CHARACTER_PLACEMENT = SCENE_CHARACTER_PLACEMENTS.player;
export const OPPONENT_CHARACTER_PLACEMENT =
  SCENE_CHARACTER_PLACEMENTS.opponent;
