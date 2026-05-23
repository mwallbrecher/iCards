import type { PostgrestError } from "@supabase/supabase-js";
import type { Rank } from "@/lib/core/card";
import { generateGameCode } from "@/lib/codes/generator";
import {
  askForCard,
  createInitialState,
  type GoFishState,
  type PlayerId,
} from "@/lib/games/gofish";
import { supabaseAdmin } from "@/lib/supabase/client";
import type { GameRow, GameStatus, PlayerRow } from "@/lib/supabase/types";

const MAX_CODE_RETRIES = 5;

export class GameNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Game not found: ${identifier}`);
    this.name = "GameNotFoundError";
  }
}

export class VersionMismatchError extends Error {
  constructor() {
    super("Game state has been modified by another request");
    this.name = "VersionMismatchError";
  }
}

export class SlotTakenError extends Error {
  constructor(slot: "A" | "B") {
    super(`Slot ${slot} is already taken`);
    this.name = "SlotTakenError";
  }
}

export class RematchNotAllowedError extends Error {
  constructor(reason: string) {
    super(`Rematch not allowed: ${reason}`);
    this.name = "RematchNotAllowedError";
  }
}

function isNoRowsError(error: PostgrestError | null): boolean {
  return error?.code === "PGRST116";
}

function nextGameStatus(state: GoFishState, currentStatus: GameStatus): GameStatus {
  return state.phase === "gameOver" ? "finished" : currentStatus;
}

export async function createGame(params: {
  sessionToken: string;
  displayName?: string;
}): Promise<{ game: GameRow; player: PlayerRow }> {
  let code: string | null = null;

  for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt += 1) {
    const candidate = generateGameCode();
    const { data: existing, error } = await supabaseAdmin
      .from("games")
      .select("id")
      .eq("code", candidate)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to check game code uniqueness: ${error.message}`);
    }

    if (!existing) {
      code = candidate;
      break;
    }
  }

  if (!code) {
    throw new Error("Failed to generate unique game code after retries");
  }

  const initialState = createInitialState();
  const { data: gameInsert, error: gameError } = await supabaseAdmin
    .from("games")
    .insert({
      code,
      state: initialState,
      version: 1,
      status: "waiting",
    })
    .select("*")
    .single();

  if (gameError || !gameInsert) {
    throw new Error(`Failed to create game: ${gameError?.message ?? "unknown"}`);
  }

  const { data: playerInsert, error: playerError } = await supabaseAdmin
    .from("players")
    .insert({
      game_id: gameInsert.id,
      slot: "A",
      session_token: params.sessionToken,
      display_name: params.displayName ?? null,
    })
    .select("*")
    .single();

  if (playerError || !playerInsert) {
    await supabaseAdmin.from("games").delete().eq("id", gameInsert.id);
    throw new Error(
      `Failed to create player: ${playerError?.message ?? "unknown"}`,
    );
  }

  return { game: gameInsert, player: playerInsert };
}

export async function loadGameByCode(code: string): Promise<GameRow> {
  const { data, error } = await supabaseAdmin
    .from("games")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load game: ${error.message}`);
  }

  if (!data) {
    throw new GameNotFoundError(code);
  }

  return data;
}

export async function loadGameById(id: string): Promise<GameRow> {
  const { data, error } = await supabaseAdmin
    .from("games")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load game: ${error.message}`);
  }

  if (!data) {
    throw new GameNotFoundError(id);
  }

  return data;
}

export async function loadPlayers(gameId: string): Promise<PlayerRow[]> {
  const { data, error } = await supabaseAdmin
    .from("players")
    .select("*")
    .eq("game_id", gameId)
    .order("joined_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load players: ${error.message}`);
  }

  return data ?? [];
}

export async function loadPlayerByToken(
  gameId: string,
  sessionToken: string,
): Promise<PlayerRow | null> {
  const { data, error } = await supabaseAdmin
    .from("players")
    .select("*")
    .eq("game_id", gameId)
    .eq("session_token", sessionToken)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load player: ${error.message}`);
  }

  return data;
}

export async function joinGame(params: {
  code: string;
  sessionToken: string;
  displayName?: string;
}): Promise<{ game: GameRow; player: PlayerRow }> {
  const game = await loadGameByCode(params.code);

  if (game.status !== "waiting") {
    const existing = await loadPlayerByToken(game.id, params.sessionToken);
    if (existing) {
      return { game, player: existing };
    }

    throw new SlotTakenError("B");
  }

  const existing = await loadPlayerByToken(game.id, params.sessionToken);
  if (existing) {
    return { game, player: existing };
  }

  const { data: playerInsert, error: playerError } = await supabaseAdmin
    .from("players")
    .insert({
      game_id: game.id,
      slot: "B",
      session_token: params.sessionToken,
      display_name: params.displayName ?? null,
    })
    .select("*")
    .single();

  if (playerError || !playerInsert) {
    if (playerError?.code === "23505") {
      throw new SlotTakenError("B");
    }

    throw new Error(`Failed to join game: ${playerError?.message ?? "unknown"}`);
  }

  const { data: gameUpdate, error: gameError } = await supabaseAdmin
    .from("games")
    .update({ status: "active" })
    .eq("id", game.id)
    .select("*")
    .single();

  if (gameError || !gameUpdate) {
    throw new Error(
      `Failed to activate game: ${gameError?.message ?? "unknown"}`,
    );
  }

  return { game: gameUpdate, player: playerInsert };
}

export async function applyAskMove(params: {
  gameId: string;
  expectedVersion: number;
  asker: PlayerId;
  target: PlayerId;
  rank: Rank;
}): Promise<GameRow> {
  const game = await loadGameById(params.gameId);

  if (game.version !== params.expectedVersion) {
    throw new VersionMismatchError();
  }

  const nextState = askForCard(
    game.state,
    params.asker,
    params.target,
    params.rank,
  );

  const { data, error } = await supabaseAdmin
    .from("games")
    .update({
      state: nextState,
      version: game.version + 1,
      status: nextGameStatus(nextState, game.status),
    })
    .eq("id", params.gameId)
    .eq("version", params.expectedVersion)
    .select("*")
    .single();

  if (error) {
    if (isNoRowsError(error)) {
      throw new VersionMismatchError();
    }

    throw new Error(`Failed to apply move: ${error.message}`);
  }

  if (!data) {
    throw new VersionMismatchError();
  }

  return data;
}

export async function requestRematch(params: {
  gameId: string;
  expectedVersion: number;
  requester: PlayerId;
}): Promise<GameRow> {
  const game = await loadGameById(params.gameId);

  if (game.version !== params.expectedVersion) {
    throw new VersionMismatchError();
  }

  if (game.status !== "finished") {
    throw new RematchNotAllowedError(`status is ${game.status}`);
  }

  const { data, error } = await supabaseAdmin
    .from("games")
    .update({
      rematch_requested_by: params.requester,
      version: game.version + 1,
    })
    .eq("id", params.gameId)
    .eq("version", params.expectedVersion)
    .select("*")
    .single();

  if (error) {
    if (isNoRowsError(error)) {
      throw new VersionMismatchError();
    }

    throw new Error(`Failed to request rematch: ${error.message}`);
  }

  if (!data) {
    throw new VersionMismatchError();
  }

  return data;
}

export async function acceptRematch(params: {
  gameId: string;
  expectedVersion: number;
  accepter: PlayerId;
}): Promise<GameRow> {
  const game = await loadGameById(params.gameId);

  if (game.version !== params.expectedVersion) {
    throw new VersionMismatchError();
  }

  if (game.status !== "finished") {
    throw new RematchNotAllowedError(`status is ${game.status}`);
  }

  if (game.rematch_requested_by === null) {
    throw new RematchNotAllowedError("no pending rematch request");
  }

  if (game.rematch_requested_by === params.accepter) {
    throw new RematchNotAllowedError("cannot accept your own rematch request");
  }

  const newState = createInitialState();
  const { data, error } = await supabaseAdmin
    .from("games")
    .update({
      state: newState,
      status: "active",
      rematch_requested_by: null,
      version: game.version + 1,
    })
    .eq("id", params.gameId)
    .eq("version", params.expectedVersion)
    .select("*")
    .single();

  if (error) {
    if (isNoRowsError(error)) {
      throw new VersionMismatchError();
    }

    throw new Error(`Failed to accept rematch: ${error.message}`);
  }

  if (!data) {
    throw new VersionMismatchError();
  }

  return data;
}

export async function declineRematch(params: {
  gameId: string;
  expectedVersion: number;
  decliner: PlayerId;
}): Promise<GameRow> {
  const game = await loadGameById(params.gameId);

  if (game.version !== params.expectedVersion) {
    throw new VersionMismatchError();
  }

  if (game.rematch_requested_by === null) {
    throw new RematchNotAllowedError("no pending rematch request");
  }

  if (game.rematch_requested_by === params.decliner) {
    throw new RematchNotAllowedError("cannot decline your own rematch request");
  }

  const { data, error } = await supabaseAdmin
    .from("games")
    .update({
      rematch_requested_by: null,
      version: game.version + 1,
    })
    .eq("id", params.gameId)
    .eq("version", params.expectedVersion)
    .select("*")
    .single();

  if (error) {
    if (isNoRowsError(error)) {
      throw new VersionMismatchError();
    }

    throw new Error(`Failed to decline rematch: ${error.message}`);
  }

  if (!data) {
    throw new VersionMismatchError();
  }

  return data;
}

export function redactStateForViewer(
  state: GoFishState,
  viewer: PlayerId,
): GoFishState {
  const opponent: PlayerId = viewer === "A" ? "B" : "A";
  const hiddenHand = state.hands[opponent].map((_, index) => ({
    id: `hidden-${opponent}-${index}`,
    rank: "A" as const,
    suit: "hearts" as const,
  }));

  return {
    ...state,
    hands: {
      ...state.hands,
      [opponent]: hiddenHand,
    },
    pool: state.pool.map((_, index) => ({
      id: `hidden-pool-${index}`,
      rank: "A" as const,
      suit: "hearts" as const,
    })),
  };
}
