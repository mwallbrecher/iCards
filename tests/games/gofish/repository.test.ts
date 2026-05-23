import { describe, expect, test } from "vitest";

const hasSupabaseConfig =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

const describeIfSupabase = hasSupabaseConfig ? describe : describe.skip;

describeIfSupabase("repository (integration)", () => {
  async function markGameFinished(
    gameId: string,
    rematchRequestedBy: "A" | "B" | null = null,
  ) {
    const { supabaseAdmin } = await import("@/lib/supabase/client");
    const { data, error } = await supabaseAdmin
      .from("games")
      .update({
        status: "finished",
        rematch_requested_by: rematchRequestedBy,
      })
      .eq("id", gameId)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to mark game finished: ${error?.message ?? "unknown"}`);
    }

    return data;
  }

  test("createGame inserts a game and a player A", async () => {
    const { createGame } = await import("@/lib/games/gofish/repository");
    const { supabaseAdmin } = await import("@/lib/supabase/client");
    const createdGameIds: string[] = [];

    try {
      const { game, player } = await createGame({
        sessionToken: "test-token-A",
      });
      createdGameIds.push(game.id);

      expect(game.code).toMatch(/^[a-z]+-[a-z]+-[a-z]+$/);
      expect(game.version).toBe(1);
      expect(game.status).toBe("waiting");
      expect(player.slot).toBe("A");
      expect(player.session_token).toBe("test-token-A");
      expect(game.state.hands.A).toHaveLength(7);
      expect(game.state.hands.B).toHaveLength(7);
    } finally {
      if (createdGameIds.length > 0) {
        await supabaseAdmin.from("games").delete().in("id", createdGameIds);
      }
    }
  });

  test("joinGame fills slot B and activates the game", async () => {
    const { createGame, joinGame } = await import("@/lib/games/gofish/repository");
    const { supabaseAdmin } = await import("@/lib/supabase/client");
    const createdGameIds: string[] = [];

    try {
      const { game } = await createGame({ sessionToken: "token-A" });
      createdGameIds.push(game.id);

      const { game: updatedGame, player } = await joinGame({
        code: game.code,
        sessionToken: "token-B",
      });

      expect(player.slot).toBe("B");
      expect(updatedGame.status).toBe("active");
    } finally {
      if (createdGameIds.length > 0) {
        await supabaseAdmin.from("games").delete().in("id", createdGameIds);
      }
    }
  });

  test("joinGame is idempotent for the same session token", async () => {
    const { createGame, joinGame } = await import("@/lib/games/gofish/repository");
    const { supabaseAdmin } = await import("@/lib/supabase/client");
    const createdGameIds: string[] = [];

    try {
      const { game } = await createGame({ sessionToken: "token-A" });
      createdGameIds.push(game.id);

      await joinGame({ code: game.code, sessionToken: "token-B" });
      const second = await joinGame({
        code: game.code,
        sessionToken: "token-B",
      });

      expect(second.player.slot).toBe("B");
    } finally {
      if (createdGameIds.length > 0) {
        await supabaseAdmin.from("games").delete().in("id", createdGameIds);
      }
    }
  });

  test("applyAskMove updates state and increments version", async () => {
    const { applyAskMove, createGame, joinGame, loadGameByCode } = await import(
      "@/lib/games/gofish/repository"
    );
    const { supabaseAdmin } = await import("@/lib/supabase/client");
    const createdGameIds: string[] = [];

    try {
      const { game } = await createGame({ sessionToken: "token-A" });
      createdGameIds.push(game.id);
      await joinGame({ code: game.code, sessionToken: "token-B" });

      const fresh = await loadGameByCode(game.code);
      const rankToAsk = fresh.state.hands.A[0]?.rank;
      if (rankToAsk === undefined) {
        throw new Error("Expected player A to have a card");
      }

      const next = await applyAskMove({
        gameId: fresh.id,
        expectedVersion: fresh.version,
        asker: "A",
        target: "B",
        rank: rankToAsk,
      });

      expect(next.version).toBe(fresh.version + 1);
      expect(next.state.history.length).toBeGreaterThan(0);
    } finally {
      if (createdGameIds.length > 0) {
        await supabaseAdmin.from("games").delete().in("id", createdGameIds);
      }
    }
  });

  test("applyAskMove rejects stale version", async () => {
    const {
      applyAskMove,
      createGame,
      joinGame,
      loadGameByCode,
      VersionMismatchError,
    } = await import("@/lib/games/gofish/repository");
    const { supabaseAdmin } = await import("@/lib/supabase/client");
    const createdGameIds: string[] = [];

    try {
      const { game } = await createGame({ sessionToken: "token-A" });
      createdGameIds.push(game.id);
      await joinGame({ code: game.code, sessionToken: "token-B" });

      const fresh = await loadGameByCode(game.code);
      const firstRank = fresh.state.hands.A[0]?.rank;
      const staleRank = fresh.state.hands.B[0]?.rank;
      if (firstRank === undefined || staleRank === undefined) {
        throw new Error("Expected both players to have cards");
      }

      await applyAskMove({
        gameId: fresh.id,
        expectedVersion: fresh.version,
        asker: "A",
        target: "B",
        rank: firstRank,
      });

      await expect(
        applyAskMove({
          gameId: fresh.id,
          expectedVersion: fresh.version,
          asker: "B",
          target: "A",
          rank: staleRank,
        }),
      ).rejects.toBeInstanceOf(VersionMismatchError);
    } finally {
      if (createdGameIds.length > 0) {
        await supabaseAdmin.from("games").delete().in("id", createdGameIds);
      }
    }
  });

  test("redactStateForViewer hides opponent hand and pool", async () => {
    const { createGame, redactStateForViewer } = await import(
      "@/lib/games/gofish/repository"
    );
    const { supabaseAdmin } = await import("@/lib/supabase/client");
    const createdGameIds: string[] = [];

    try {
      const { game } = await createGame({ sessionToken: "token-A" });
      createdGameIds.push(game.id);

      const redacted = redactStateForViewer(game.state, "A");

      expect(redacted.hands.A).toEqual(game.state.hands.A);
      expect(redacted.hands.B).toHaveLength(game.state.hands.B.length);
      expect(redacted.hands.B[0]?.id).toMatch(/^hidden-/);
      expect(redacted.pool).toHaveLength(game.state.pool.length);
      expect(redacted.pool[0]?.id).toMatch(/^hidden-/);
    } finally {
      if (createdGameIds.length > 0) {
        await supabaseAdmin.from("games").delete().in("id", createdGameIds);
      }
    }
  });

  test("requestRematch succeeds when game is finished", async () => {
    const { createGame, requestRematch } = await import(
      "@/lib/games/gofish/repository"
    );
    const { supabaseAdmin } = await import("@/lib/supabase/client");
    const createdGameIds: string[] = [];

    try {
      const { game } = await createGame({ sessionToken: "token-A" });
      createdGameIds.push(game.id);
      const finished = await markGameFinished(game.id);

      const next = await requestRematch({
        gameId: finished.id,
        expectedVersion: finished.version,
        requester: "A",
      });

      expect(next.rematch_requested_by).toBe("A");
      expect(next.version).toBe(finished.version + 1);
      expect(next.status).toBe("finished");
    } finally {
      if (createdGameIds.length > 0) {
        await supabaseAdmin.from("games").delete().in("id", createdGameIds);
      }
    }
  });

  test("requestRematch throws when game is active", async () => {
    const { createGame, joinGame, requestRematch, RematchNotAllowedError } =
      await import("@/lib/games/gofish/repository");
    const { supabaseAdmin } = await import("@/lib/supabase/client");
    const createdGameIds: string[] = [];

    try {
      const { game } = await createGame({ sessionToken: "token-A" });
      createdGameIds.push(game.id);
      const { game: activeGame } = await joinGame({
        code: game.code,
        sessionToken: "token-B",
      });

      await expect(
        requestRematch({
          gameId: activeGame.id,
          expectedVersion: activeGame.version,
          requester: "A",
        }),
      ).rejects.toBeInstanceOf(RematchNotAllowedError);
    } finally {
      if (createdGameIds.length > 0) {
        await supabaseAdmin.from("games").delete().in("id", createdGameIds);
      }
    }
  });

  test("acceptRematch creates a fresh active deal and clears request", async () => {
    const { acceptRematch, createGame } = await import(
      "@/lib/games/gofish/repository"
    );
    const { supabaseAdmin } = await import("@/lib/supabase/client");
    const createdGameIds: string[] = [];

    try {
      const { game } = await createGame({ sessionToken: "token-A" });
      createdGameIds.push(game.id);
      const finished = await markGameFinished(game.id, "A");

      const next = await acceptRematch({
        gameId: finished.id,
        expectedVersion: finished.version,
        accepter: "B",
      });

      expect(next.status).toBe("active");
      expect(next.rematch_requested_by).toBeNull();
      expect(next.version).toBe(finished.version + 1);
      expect(next.state.hands.A).toHaveLength(7);
      expect(next.state.hands.B).toHaveLength(7);
      expect(next.state.history).toEqual([]);
    } finally {
      if (createdGameIds.length > 0) {
        await supabaseAdmin.from("games").delete().in("id", createdGameIds);
      }
    }
  });

  test("acceptRematch rejects when accepter requested the rematch", async () => {
    const { acceptRematch, createGame, RematchNotAllowedError } = await import(
      "@/lib/games/gofish/repository"
    );
    const { supabaseAdmin } = await import("@/lib/supabase/client");
    const createdGameIds: string[] = [];

    try {
      const { game } = await createGame({ sessionToken: "token-A" });
      createdGameIds.push(game.id);
      const finished = await markGameFinished(game.id, "A");

      await expect(
        acceptRematch({
          gameId: finished.id,
          expectedVersion: finished.version,
          accepter: "A",
        }),
      ).rejects.toBeInstanceOf(RematchNotAllowedError);
    } finally {
      if (createdGameIds.length > 0) {
        await supabaseAdmin.from("games").delete().in("id", createdGameIds);
      }
    }
  });

  test("declineRematch clears request and keeps game finished", async () => {
    const { createGame, declineRematch } = await import(
      "@/lib/games/gofish/repository"
    );
    const { supabaseAdmin } = await import("@/lib/supabase/client");
    const createdGameIds: string[] = [];

    try {
      const { game } = await createGame({ sessionToken: "token-A" });
      createdGameIds.push(game.id);
      const finished = await markGameFinished(game.id, "A");

      const next = await declineRematch({
        gameId: finished.id,
        expectedVersion: finished.version,
        decliner: "B",
      });

      expect(next.rematch_requested_by).toBeNull();
      expect(next.status).toBe("finished");
      expect(next.version).toBe(finished.version + 1);
    } finally {
      if (createdGameIds.length > 0) {
        await supabaseAdmin.from("games").delete().in("id", createdGameIds);
      }
    }
  });
});
