import type { GoFishState } from "@/lib/games/gofish";
import type { PlayerId } from "@/lib/core/types";

export type GameStatus = "waiting" | "active" | "finished" | "abandoned";

export type GameRow = {
  id: string;
  code: string;
  state: GoFishState;
  version: number;
  status: GameStatus;
  rematch_requested_by: PlayerId | null;
  created_at: string;
  updated_at: string;
};

export type PlayerRow = {
  id: string;
  game_id: string;
  slot: "A" | "B";
  session_token: string;
  display_name: string | null;
  joined_at: string;
};

export type Database = {
  public: {
    Tables: {
      games: {
        Row: GameRow;
        Insert: Omit<
          GameRow,
          "id" | "created_at" | "updated_at" | "rematch_requested_by"
        > & {
          id?: string;
          rematch_requested_by?: PlayerId | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<GameRow>;
        Relationships: [];
      };
      players: {
        Row: PlayerRow;
        Insert: Omit<PlayerRow, "id" | "joined_at"> & {
          id?: string;
          joined_at?: string;
        };
        Update: Partial<PlayerRow>;
        Relationships: [
          {
            foreignKeyName: "players_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
