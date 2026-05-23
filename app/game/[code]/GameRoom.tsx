"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  ConnectionStatus,
  type ConnectionState,
} from "@/components/ConnectionStatus";
import { GameView } from "@/components/GameView";
import { Lobby } from "@/components/Lobby";
import { RematchPrompt } from "@/components/RematchPrompt";
import type { Rank } from "@/lib/core/card";
import {
  acceptRematchAction,
  askForCardAction,
  declineRematchAction,
  getGameViewAction,
  requestRematchAction,
  type ClientGameView,
} from "@/lib/games/gofish/actions";
import { getBrowserSupabase } from "@/lib/supabase/browser";

const RECONNECT_BANNER_DELAY_MS = 2000;

type GameRoomProps = {
  initialView: ClientGameView;
  code: string;
  gameId: string;
};

export function GameRoom({ initialView, code, gameId }: GameRoomProps) {
  const [view, setView] = useState(initialView);
  const [selectedRank, setSelectedRank] = useState<Rank | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting");
  const hasConnectedOnceRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = useCallback(async () => {
    try {
      const fresh = await getGameViewAction(code);
      setView(fresh);
    } catch (caught) {
      console.error("Refetch failed:", caught);
    }
  }, [code]);

  useEffect(() => {
    let disposed = false;
    const supabase = getBrowserSupabase();
    const channel = supabase
      .channel(`game:${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        () => {
          void refetch();
        },
      )
      .subscribe((status) => {
        if (disposed) {
          return;
        }

        if (status === "SUBSCRIBED") {
          if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
          }

          setConnectionState("connected");

          if (!hasConnectedOnceRef.current) {
            hasConnectedOnceRef.current = true;
          }

          void refetch();
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
          }

          reconnectTimerRef.current = setTimeout(() => {
            setConnectionState(
              hasConnectedOnceRef.current ? "reconnecting" : "error",
            );
          }, RECONNECT_BANNER_DELAY_MS);
          return;
        }

        if (status === "CLOSED" && hasConnectedOnceRef.current) {
          if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
          }

          reconnectTimerRef.current = setTimeout(() => {
            setConnectionState("reconnecting");
          }, RECONNECT_BANNER_DELAY_MS);
        }
      });

    return () => {
      disposed = true;

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      void supabase.removeChannel(channel);
    };
  }, [gameId, refetch]);

  function handleAsk(rank: Rank) {
    setError(null);
    startTransition(async () => {
      try {
        const next = await askForCardAction({
          code,
          expectedVersion: view.version,
          rank,
        });
        setView(next);
        setSelectedRank(null);
      } catch (caught) {
        setError((caught as Error).message);
        void refetch();
      }
    });
  }

  function handleRequestRematch() {
    setError(null);
    startTransition(async () => {
      try {
        const next = await requestRematchAction({
          code,
          expectedVersion: view.version,
        });
        setView(next);
      } catch (caught) {
        setError((caught as Error).message);
        void refetch();
      }
    });
  }

  function handleAcceptRematch() {
    setError(null);
    startTransition(async () => {
      try {
        const next = await acceptRematchAction({
          code,
          expectedVersion: view.version,
        });
        setView(next);
        setSelectedRank(null);
      } catch (caught) {
        setError((caught as Error).message);
        void refetch();
      }
    });
  }

  function handleDeclineRematch() {
    setError(null);
    startTransition(async () => {
      try {
        const next = await declineRematchAction({
          code,
          expectedVersion: view.version,
        });
        setView(next);
      } catch (caught) {
        setError((caught as Error).message);
        void refetch();
      }
    });
  }

  if (view.status === "waiting") {
    return (
      <>
        <ConnectionStatus state={connectionState} />
        <Lobby code={code} viewerName="You" />
      </>
    );
  }

  return (
    <>
      <ConnectionStatus state={connectionState} />
      <GameView
        state={view.state}
        viewerPlayer={view.viewerSlot ?? "A"}
        opponentLabel={view.opponentName}
        isViewerTurn={
          view.viewerSlot !== null &&
          view.state.currentPlayer === view.viewerSlot &&
          view.status === "active"
        }
        opponentThinking={false}
        selectedRank={selectedRank}
        onSelectRank={setSelectedRank}
        onAskForCard={handleAsk}
        onNewGame={() => {
          window.location.href = "/";
        }}
        showGameOverNewGameButton={false}
      />

      {view.status === "finished" && view.rematchRequestedBy === null ? (
        <RematchPrompt
          mode="initiate"
          onRequest={handleRequestRematch}
          onLeave={() => {
            window.location.href = "/";
          }}
          pending={pending}
        />
      ) : null}

      {view.status === "finished" &&
      view.rematchRequestedBy !== null &&
      view.rematchRequestedBy === view.viewerSlot ? (
        <RematchPrompt
          mode="waiting"
          opponentName={view.opponentName}
          onLeave={() => {
            window.location.href = "/";
          }}
        />
      ) : null}

      {view.status === "finished" &&
      view.rematchRequestedBy !== null &&
      view.rematchRequestedBy !== view.viewerSlot ? (
        <RematchPrompt
          mode="incoming"
          opponentName={view.opponentName}
          onAccept={handleAcceptRematch}
          onDecline={handleDeclineRematch}
          pending={pending}
        />
      ) : null}

      {error ? (
        <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg">
          {error}
        </div>
      ) : null}
    </>
  );
}
