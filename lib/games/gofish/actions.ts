"use server";

import type { Rank } from "@/lib/core/card";
import type { GoFishState, PlayerId } from "@/lib/games/gofish";
import {
  acceptRematch,
  applyAskMove,
  createGame,
  declineRematch,
  GameNotFoundError,
  joinGame,
  loadGameByCode,
  loadPlayerByToken,
  loadPlayers,
  redactStateForViewer,
  RematchNotAllowedError,
  requestRematch,
  SlotTakenError,
  VersionMismatchError,
} from "@/lib/games/gofish/repository";
import { getOrCreateSessionToken } from "@/lib/session/token";
import type { GameStatus } from "@/lib/supabase/types";

export type ClientGameView = {
  gameId: string;
  code: string;
  status: GameStatus;
  version: number;
  state: GoFishState;
  viewerSlot: PlayerId | null;
  opponentName: string;
  opponentPresent: boolean;
  rematchRequestedBy: PlayerId | null;
};

function displayNameFromForm(formData: FormData): string | undefined {
  const displayName = formData.get("displayName");
  if (typeof displayName !== "string") {
    return undefined;
  }

  return displayName.trim() || undefined;
}

function codeFromForm(formData: FormData): string {
  const code = formData.get("code");
  if (typeof code !== "string" || code.trim().length === 0) {
    throw new Error("Code is required");
  }

  return code.trim().toLowerCase();
}

async function loadViewForToken(
  code: string,
  sessionToken: string,
): Promise<ClientGameView> {
  const game = await loadGameByCode(code);
  const player = await loadPlayerByToken(game.id, sessionToken);

  if (!player) {
    throw new Error("You are not a player in this game");
  }

  const opponentSlot: PlayerId = player.slot === "A" ? "B" : "A";
  const players = await loadPlayers(game.id);
  const opponent = players.find((candidate) => candidate.slot === opponentSlot);

  return {
    gameId: game.id,
    code: game.code,
    status: game.status,
    version: game.version,
    state: redactStateForViewer(game.state, player.slot),
    viewerSlot: player.slot,
    opponentName: opponent?.display_name ?? "Opponent",
    opponentPresent: opponent !== undefined,
    rematchRequestedBy: game.rematch_requested_by,
  };
}

export async function createGameAction(
  formData: FormData,
): Promise<{ code: string }> {
  const token = await getOrCreateSessionToken();
  const { game } = await createGame({
    sessionToken: token,
    displayName: displayNameFromForm(formData),
  });

  return { code: game.code };
}

export async function joinGameAction(
  formData: FormData,
): Promise<{ code: string }> {
  const code = codeFromForm(formData);
  const token = await getOrCreateSessionToken();

  try {
    await joinGame({
      code,
      sessionToken: token,
      displayName: displayNameFromForm(formData),
    });
  } catch (error) {
    if (error instanceof GameNotFoundError) {
      throw new Error("No game found with that code");
    }

    if (error instanceof SlotTakenError) {
      throw new Error("That game is already full");
    }

    throw error;
  }

  return { code };
}

export async function joinGameByCodeAction(
  code: string,
): Promise<{ code: string }> {
  const token = await getOrCreateSessionToken();

  try {
    await joinGame({
      code: code.trim().toLowerCase(),
      sessionToken: token,
    });
  } catch (error) {
    if (error instanceof GameNotFoundError) {
      throw new Error("No game found with that code");
    }

    if (error instanceof SlotTakenError) {
      throw new Error("That game is already full");
    }

    throw error;
  }

  return { code: code.trim().toLowerCase() };
}

export async function getGameViewAction(code: string): Promise<ClientGameView> {
  const token = await getOrCreateSessionToken();
  return loadViewForToken(code, token);
}

export async function askForCardAction(params: {
  code: string;
  expectedVersion: number;
  rank: Rank;
}): Promise<ClientGameView> {
  const token = await getOrCreateSessionToken();
  const game = await loadGameByCode(params.code);
  const player = await loadPlayerByToken(game.id, token);
  if (!player) {
    throw new Error("You are not a player in this game");
  }

  const opponentSlot: PlayerId = player.slot === "A" ? "B" : "A";

  try {
    await applyAskMove({
      gameId: game.id,
      expectedVersion: params.expectedVersion,
      asker: player.slot,
      target: opponentSlot,
      rank: params.rank,
    });
  } catch (error) {
    if (error instanceof VersionMismatchError) {
      throw new Error("Game state changed, please retry");
    }

    throw error;
  }

  return loadViewForToken(params.code, token);
}

export async function requestRematchAction(params: {
  code: string;
  expectedVersion: number;
}): Promise<ClientGameView> {
  const token = await getOrCreateSessionToken();
  const game = await loadGameByCode(params.code);
  const player = await loadPlayerByToken(game.id, token);
  if (!player) {
    throw new Error("You are not a player in this game");
  }

  try {
    await requestRematch({
      gameId: game.id,
      expectedVersion: params.expectedVersion,
      requester: player.slot,
    });
  } catch (error) {
    if (error instanceof VersionMismatchError) {
      throw new Error("Game state changed, please retry");
    }

    if (error instanceof RematchNotAllowedError) {
      throw new Error(error.message);
    }

    throw error;
  }

  return loadViewForToken(params.code, token);
}

export async function acceptRematchAction(params: {
  code: string;
  expectedVersion: number;
}): Promise<ClientGameView> {
  const token = await getOrCreateSessionToken();
  const game = await loadGameByCode(params.code);
  const player = await loadPlayerByToken(game.id, token);
  if (!player) {
    throw new Error("You are not a player in this game");
  }

  try {
    await acceptRematch({
      gameId: game.id,
      expectedVersion: params.expectedVersion,
      accepter: player.slot,
    });
  } catch (error) {
    if (error instanceof VersionMismatchError) {
      throw new Error("Game state changed, please retry");
    }

    if (error instanceof RematchNotAllowedError) {
      throw new Error(error.message);
    }

    throw error;
  }

  return loadViewForToken(params.code, token);
}

export async function declineRematchAction(params: {
  code: string;
  expectedVersion: number;
}): Promise<ClientGameView> {
  const token = await getOrCreateSessionToken();
  const game = await loadGameByCode(params.code);
  const player = await loadPlayerByToken(game.id, token);
  if (!player) {
    throw new Error("You are not a player in this game");
  }

  try {
    await declineRematch({
      gameId: game.id,
      expectedVersion: params.expectedVersion,
      decliner: player.slot,
    });
  } catch (error) {
    if (error instanceof VersionMismatchError) {
      throw new Error("Game state changed, please retry");
    }

    if (error instanceof RematchNotAllowedError) {
      throw new Error(error.message);
    }

    throw error;
  }

  return loadViewForToken(params.code, token);
}
