"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Card as CoreCard, Rank } from "@/lib/core/card";
import { SUITS } from "@/lib/core/card";
import type { GoFishState, PlayerId } from "@/lib/games/gofish";
import {
  CARD_RANK_ORDER,
  CardSprite,
  type CardSpriteRank,
} from "@/components/CardSprite";
import type { CharacterAnimation } from "@/components/PixelCharacter";
import {
  SceneRenderer,
  SCENE_CHARACTER_FISHING_DURATION_MS,
} from "@/components/SceneRenderer";
import {
  SCENE_CHARACTER_PLACEMENTS,
  type SceneCharacterId,
} from "@/lib/scene/character-config";
import { generateScene } from "@/lib/scene/generator";

const FISHED_CARD_REVEAL_DELAY_MS = Math.round(
  SCENE_CHARACTER_FISHING_DURATION_MS * 0.8,
);
const FISHED_CARD_HOLD_AFTER_ANIMATION_MS = 800;
const CHEST_OPEN_BEFORE_CARD_REVEAL_MS = -50;
const HAND_POP_DURATION_MS = 900;
const STOLEN_CARD_FLICK_DURATION_MS = 1150;
const CHEST_DECORATION_ID = "land-chest";
const CHEST_OPEN_FILE_PATH = "/graphics/decorations/land/chest/land-chest-1.png";
const ASK_CARD_HOLD_MS = 620;
const ASK_SUCCESS_RESULT_HOLD_MS = 900;
const ASK_CARD_MISS_HOLD_MS = 520;
export const ASK_SUCCESS_ANIMATION_TOTAL_MS =
  ASK_CARD_HOLD_MS + ASK_SUCCESS_RESULT_HOLD_MS;
export const ASK_MISS_ANIMATION_TOTAL_MS =
  ASK_CARD_HOLD_MS +
  ASK_CARD_MISS_HOLD_MS +
  SCENE_CHARACTER_FISHING_DURATION_MS +
  FISHED_CARD_HOLD_AFTER_ANIMATION_MS;

type GameViewProps = {
  state: GoFishState;
  viewerPlayer: PlayerId;
  isViewerTurn: boolean;
  onAskForCard: (rank: Rank) => void;
};

type GoFishEvent = Extract<
  GoFishState["history"][number],
  { type: "goFish" }
>;
type AskEvent = Extract<GoFishState["history"][number], { type: "ask" }>;

type AskEffectPhase = "asking" | "success" | "miss";

type AskEffect = {
  asker: SceneCharacterId;
  cardsGiven: number;
  id: string;
  phase: AskEffectPhase;
  rank: Rank;
};

type StolenCardEffect = {
  count: number;
  id: string;
  rank: Rank;
};

function otherPlayer(player: PlayerId): PlayerId {
  return player === "A" ? "B" : "A";
}

function sceneCharacterForPlayer(
  player: PlayerId,
  viewerPlayer: PlayerId,
): SceneCharacterId {
  return player === viewerPlayer ? "player" : "opponent";
}

function isAskEvent(event: GoFishState["history"][number]): event is AskEvent {
  return event.type === "ask";
}

function isGoFishEventForPlayer(
  event: GoFishState["history"][number],
  player: PlayerId,
): event is GoFishEvent {
  return event.type === "goFish" && event.player === player;
}

function sortCards(cards: CoreCard[]): CoreCard[] {
  return [...cards].sort((left, right) => {
    const rankDiff =
      CARD_RANK_ORDER.indexOf(left.rank) - CARD_RANK_ORDER.indexOf(right.rank);

    if (rankDiff !== 0) {
      return rankDiff;
    }

    return SUITS.indexOf(left.suit) - SUITS.indexOf(right.suit);
  });
}

function toRank(value: string | null): Rank | null {
  if (value === null) {
    return null;
  }

  return CARD_RANK_ORDER.includes(value as Rank) ? (value as Rank) : null;
}

function renderAskScreenOverlay(askEffect: AskEffect | null) {
  if (askEffect === null) {
    return null;
  }

  const isSuccess = askEffect.phase === "success";
  const displayRank: CardSpriteRank =
    askEffect.phase === "miss" ? "X" : askEffect.rank;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center select-none"
      data-ask-effect-screen={askEffect.asker}
      data-ask-effect-phase={askEffect.phase}
      key={askEffect.id}
    >
      <div
        className="flex -translate-y-12 flex-col items-center gap-2"
        style={{
          fontFamily: '"Departure Mono", var(--font-mono), monospace',
        }}
      >
        {isSuccess ? (
          <div
            className="rounded-[3px] px-2 py-1 text-[20px] leading-none tracking-normal"
            data-ask-effect-got="true"
            style={{
              background: "rgba(255, 255, 255, 0.55)",
              color: "rgba(0, 0, 0, 0.7)",
              imageRendering: "pixelated",
            }}
          >
            got:
          </div>
        ) : null}

        <div
          className="drop-shadow-[0_8px_10px_rgba(0,0,0,0.35)]"
          data-ask-effect-card={askEffect.asker}
          style={{
            transform:
              askEffect.phase === "asking" ? "translateY(-4px)" : undefined,
          }}
        >
          <CardSprite
            atlas={isSuccess ? "hand" : "ui"}
            rank={displayRank}
            scale={isSuccess ? 1.12 : 1.18}
          />
        </div>

        {isSuccess ? (
          <div
            className="rounded-[3px] px-2 py-1 text-[22px] leading-none tracking-normal"
            data-ask-effect-count={askEffect.cardsGiven}
            style={{
              background: "rgba(255, 255, 255, 0.55)",
              color: "rgba(0, 0, 0, 0.7)",
              imageRendering: "pixelated",
            }}
          >
            x{askEffect.cardsGiven}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function renderHandPopOverlay(handPopRank: Rank | null) {
  if (handPopRank === null) {
    return null;
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-24 z-30 flex justify-center select-none"
      data-hand-pop-card={handPopRank}
    >
      <div
        className="drop-shadow-[0_8px_10px_rgba(0,0,0,0.35)]"
        style={{
          animation: `card-hand-pop ${HAND_POP_DURATION_MS}ms ease-out`,
        }}
      >
        <CardSprite atlas="hand" rank={handPopRank} scale={0.95} />
      </div>
    </div>
  );
}

function renderStolenCardFlickOverlay(effect: StolenCardEffect | null) {
  if (effect === null) {
    return null;
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-20 z-30 flex justify-center select-none"
      data-stolen-card-rank={effect.rank}
      data-stolen-card-count={effect.count}
      key={effect.id}
    >
      <div
        className="relative drop-shadow-[0_8px_10px_rgba(0,0,0,0.35)]"
        style={{
          animation: `card-stolen-flick ${STOLEN_CARD_FLICK_DURATION_MS}ms ease-out forwards`,
        }}
      >
        <CardSprite atlas="hand" rank={effect.rank} scale={0.95} />
        {effect.count > 1 ? (
          <div
            className="absolute -right-2 -top-2 rounded-[3px] px-1.5 py-1 text-[16px] leading-none tracking-normal"
            style={{
              background: "rgba(255, 255, 255, 0.64)",
              color: "rgba(0, 0, 0, 0.72)",
              fontFamily: '"Departure Mono", var(--font-mono), monospace',
              imageRendering: "pixelated",
            }}
          >
            x{effect.count}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function renderBookCountSceneOverlay({
  computedScale,
  opponentBookCount,
  playerBookCount,
  tilePx,
}: {
  computedScale: number;
  opponentBookCount: number;
  playerBookCount: number;
  tilePx: number;
}) {
  const entries: Array<{ characterId: SceneCharacterId; count: number }> = [
    { characterId: "opponent", count: opponentBookCount },
    { characterId: "player", count: playerBookCount },
  ];
  const fontSize = Math.round(Math.min(72, Math.max(30, computedScale * 20)));

  return (
    <>
      {entries.map(({ characterId, count }) => {
        const placement = SCENE_CHARACTER_PLACEMENTS[characterId];

        if (!placement.enabled) {
          return null;
        }

        const characterX = Math.round(placement.tileX * tilePx);
        const characterY = Math.round(placement.tileY * tilePx);
        const characterWidth = 50 * computedScale;
        const characterHeight = 44 * computedScale;
        const gap = Math.max(8, Math.round(5 * computedScale));
        const placeRight = placement.direction === "right";

        return (
          <div
            aria-hidden
            data-book-count={count}
            data-book-count-character-id={characterId}
            key={characterId}
            style={{
              color: "rgba(0, 0, 0, 0.42)",
              fontFamily: '"Departure Mono", var(--font-mono), monospace',
              fontSize,
              fontWeight: 400,
              left: Math.round(
                placeRight ? characterX + characterWidth + gap : characterX - gap,
              ),
              lineHeight: 1,
              pointerEvents: "none",
              position: "absolute",
              textShadow: "0 1px 0 rgba(255, 255, 255, 0.16)",
              top: Math.round(characterY + characterHeight * 0.46),
              transform: placeRight ? "translateY(-50%)" : "translate(-100%, -50%)",
              zIndex: 14,
            }}
          >
            {count}
          </div>
        );
      })}
    </>
  );
}

export function GameView({
  state,
  viewerPlayer,
  isViewerTurn,
  onAskForCard,
}: GameViewProps) {
  const opponent = otherPlayer(viewerPlayer);
  const scene = useMemo(() => generateScene("default"), []);
  const sortedHand = useMemo(
    () => sortCards(state.hands[viewerPlayer]),
    [state.hands, viewerPlayer],
  );
  const overlapClass =
    sortedHand.length > 10 ? "-ml-9 first:ml-0" : "-ml-6 first:ml-0";

  const [characterAnim, setCharacterAnim] =
    useState<CharacterAnimation>("idle");
  const [opponentCharacterAnim, setOpponentCharacterAnim] =
    useState<CharacterAnimation>("idle");
  const [characterRunId, setCharacterRunId] = useState(0);
  const [opponentCharacterRunId, setOpponentCharacterRunId] = useState(0);
  const [fishedCardRank, setFishedCardRank] = useState<Rank | null>(null);
  const [isChestOpen, setIsChestOpen] = useState(false);
  const [handPopRank, setHandPopRank] = useState<Rank | null>(null);
  const [stolenCardEffect, setStolenCardEffect] =
    useState<StolenCardEffect | null>(null);
  const [askEffect, setAskEffect] = useState<AskEffect | null>(null);
  const lastSeenHistoryLengthRef = useRef(state.history.length);
  const fishedCardRankRef = useRef<Rank | null>(null);
  const fishedCardRevealTimerRef = useRef<number | null>(null);
  const fishedCardHideTimerRef = useRef<number | null>(null);
  const chestOpenTimerRef = useRef<number | null>(null);
  const handPopTimerRef = useRef<number | null>(null);
  const stolenCardTimerRef = useRef<number | null>(null);
  const askEffectTimersRef = useRef<number[]>([]);
  const hasActiveVisualEffect =
    askEffect !== null ||
    characterAnim === "fishing" ||
    opponentCharacterAnim === "fishing" ||
    fishedCardRank !== null ||
    handPopRank !== null ||
    stolenCardEffect !== null;
  const canAsk =
    isViewerTurn && state.phase !== "gameOver" && !hasActiveVisualEffect;

  useEffect(() => {
    fishedCardRankRef.current = fishedCardRank;
  }, [fishedCardRank]);

  const clearFishedCardRevealTimer = useCallback(() => {
    if (fishedCardRevealTimerRef.current === null) {
      return;
    }

    window.clearTimeout(fishedCardRevealTimerRef.current);
    fishedCardRevealTimerRef.current = null;
  }, []);

  const clearFishedCardHideTimer = useCallback(() => {
    if (fishedCardHideTimerRef.current === null) {
      return;
    }

    window.clearTimeout(fishedCardHideTimerRef.current);
    fishedCardHideTimerRef.current = null;
  }, []);

  const clearFishedCardTimers = useCallback(() => {
    clearFishedCardRevealTimer();
    clearFishedCardHideTimer();
  }, [clearFishedCardHideTimer, clearFishedCardRevealTimer]);

  const clearChestOpenTimer = useCallback(() => {
    if (chestOpenTimerRef.current === null) {
      return;
    }

    window.clearTimeout(chestOpenTimerRef.current);
    chestOpenTimerRef.current = null;
  }, []);

  const clearHandPopTimer = useCallback(() => {
    if (handPopTimerRef.current === null) {
      return;
    }

    window.clearTimeout(handPopTimerRef.current);
    handPopTimerRef.current = null;
  }, []);

  const clearStolenCardTimer = useCallback(() => {
    if (stolenCardTimerRef.current === null) {
      return;
    }

    window.clearTimeout(stolenCardTimerRef.current);
    stolenCardTimerRef.current = null;
  }, []);

  const clearAskEffectTimers = useCallback(() => {
    askEffectTimersRef.current.forEach((timer) => {
      window.clearTimeout(timer);
    });
    askEffectTimersRef.current = [];
  }, []);

  const scheduleAskEffectTimer = useCallback(
    (callback: () => void, delayMs: number) => {
      const timer = window.setTimeout(() => {
        askEffectTimersRef.current = askEffectTimersRef.current.filter(
          (scheduledTimer) => scheduledTimer !== timer,
        );
        callback();
      }, delayMs);

      askEffectTimersRef.current.push(timer);
    },
    [],
  );

  useEffect(() => {
    return () => {
      clearAskEffectTimers();
      clearChestOpenTimer();
      clearFishedCardTimers();
      clearHandPopTimer();
      clearStolenCardTimer();
    };
  }, [
    clearAskEffectTimers,
    clearChestOpenTimer,
    clearFishedCardTimers,
    clearHandPopTimer,
    clearStolenCardTimer,
  ]);

  const startFishingAnimation = useCallback(
    (characterId: SceneCharacterId, goFishEvent?: GoFishEvent) => {
      clearFishedCardTimers();
      clearChestOpenTimer();
      clearHandPopTimer();
      clearStolenCardTimer();
      fishedCardRankRef.current = null;
      setFishedCardRank(null);
      setHandPopRank(null);
      setStolenCardEffect(null);
      setIsChestOpen(false);

      if (characterId === "player") {
        setCharacterAnim("fishing");
        setCharacterRunId((runId) => runId + 1);

        const drawnRank = toRank(goFishEvent?.drewRank ?? null);
        if (drawnRank !== null) {
          chestOpenTimerRef.current = window.setTimeout(
            () => {
              setIsChestOpen(true);
              chestOpenTimerRef.current = null;
            },
            Math.max(
              0,
              FISHED_CARD_REVEAL_DELAY_MS - CHEST_OPEN_BEFORE_CARD_REVEAL_MS,
            ),
          );

          fishedCardRevealTimerRef.current = window.setTimeout(() => {
            fishedCardRankRef.current = drawnRank;
            setFishedCardRank(drawnRank);
            fishedCardRevealTimerRef.current = null;
          }, FISHED_CARD_REVEAL_DELAY_MS);
        }

        return;
      }

      setOpponentCharacterAnim("fishing");
      setOpponentCharacterRunId((runId) => runId + 1);
    },
    [
      clearChestOpenTimer,
      clearFishedCardTimers,
      clearHandPopTimer,
      clearStolenCardTimer,
    ],
  );

  const runAskSequence = useCallback(
    (askEvent: AskEvent, goFishEvent?: GoFishEvent) => {
      const requestedRank = toRank(askEvent.rank);
      const asker = sceneCharacterForPlayer(askEvent.from, viewerPlayer);

      if (requestedRank === null) {
        if (!askEvent.success) {
          startFishingAnimation(asker, goFishEvent);
        }
        return;
      }

      const id = `${Date.now()}-${askEvent.from}-${askEvent.to}-${askEvent.rank}`;

      clearAskEffectTimers();
      clearChestOpenTimer();
      clearFishedCardTimers();
      clearHandPopTimer();
      clearStolenCardTimer();
      fishedCardRankRef.current = null;
      setFishedCardRank(null);
      setHandPopRank(null);
      setStolenCardEffect(null);
      setIsChestOpen(false);
      setAskEffect({
        asker,
        cardsGiven: askEvent.cardsGiven,
        id,
        phase: "asking",
        rank: requestedRank,
      });

      if (askEvent.success) {
        scheduleAskEffectTimer(() => {
          setAskEffect((currentEffect) =>
            currentEffect?.id === id
              ? { ...currentEffect, phase: "success" }
              : currentEffect,
          );

          if (askEvent.from === opponent && askEvent.to === viewerPlayer) {
            const effectId = `${id}-stolen`;
            clearStolenCardTimer();
            setStolenCardEffect({
              count: askEvent.cardsGiven,
              id: effectId,
              rank: requestedRank,
            });
            stolenCardTimerRef.current = window.setTimeout(() => {
              setStolenCardEffect((currentEffect) =>
                currentEffect?.id === effectId ? null : currentEffect,
              );
              stolenCardTimerRef.current = null;
            }, STOLEN_CARD_FLICK_DURATION_MS);
          }
        }, ASK_CARD_HOLD_MS);

        scheduleAskEffectTimer(() => {
          setAskEffect((currentEffect) =>
            currentEffect?.id === id ? null : currentEffect,
          );
        }, ASK_CARD_HOLD_MS + ASK_SUCCESS_RESULT_HOLD_MS);
        return;
      }

      scheduleAskEffectTimer(() => {
        setAskEffect((currentEffect) =>
          currentEffect?.id === id
            ? { ...currentEffect, phase: "miss" }
            : currentEffect,
        );
      }, ASK_CARD_HOLD_MS);

      scheduleAskEffectTimer(() => {
        setAskEffect((currentEffect) =>
          currentEffect?.id === id ? null : currentEffect,
        );
        startFishingAnimation(asker, goFishEvent);
      }, ASK_CARD_HOLD_MS + ASK_CARD_MISS_HOLD_MS);
    },
    [
      clearAskEffectTimers,
      clearChestOpenTimer,
      clearFishedCardTimers,
      clearHandPopTimer,
      clearStolenCardTimer,
      opponent,
      scheduleAskEffectTimer,
      startFishingAnimation,
      viewerPlayer,
    ],
  );

  useEffect(() => {
    const prevLength = lastSeenHistoryLengthRef.current;
    const newEvents = state.history.slice(prevLength);
    lastSeenHistoryLengthRef.current = state.history.length;

    const askEvent = [...newEvents].reverse().find(isAskEvent);
    if (askEvent !== undefined) {
      const askGoFishEvent = [...newEvents]
        .reverse()
        .find((event) => isGoFishEventForPlayer(event, askEvent.from));
      runAskSequence(askEvent, askGoFishEvent);
      return;
    }

    const viewerGoFishEvent = [...newEvents]
      .reverse()
      .find((event) => isGoFishEventForPlayer(event, viewerPlayer));
    const opponentGoFishEvent = [...newEvents]
      .reverse()
      .find((event) => isGoFishEventForPlayer(event, opponent));

    if (viewerGoFishEvent !== undefined) {
      startFishingAnimation("player", viewerGoFishEvent);
    }

    if (opponentGoFishEvent !== undefined) {
      startFishingAnimation("opponent", opponentGoFishEvent);
    }
  }, [
    opponent,
    runAskSequence,
    startFishingAnimation,
    state.history,
    viewerPlayer,
  ]);

  function handleSceneCharacterAnimationComplete(
    characterId: SceneCharacterId,
  ) {
    if (characterId === "player") {
      clearFishedCardRevealTimer();
      clearFishedCardHideTimer();
      setCharacterAnim("idle");
      fishedCardHideTimerRef.current = window.setTimeout(() => {
        const rankToPop = fishedCardRankRef.current;
        fishedCardRankRef.current = null;
        setFishedCardRank(null);
        setIsChestOpen(false);
        fishedCardHideTimerRef.current = null;

        if (rankToPop !== null) {
          clearHandPopTimer();
          setHandPopRank(rankToPop);
          handPopTimerRef.current = window.setTimeout(() => {
            setHandPopRank(null);
            handPopTimerRef.current = null;
          }, HAND_POP_DURATION_MS);
        }
      }, FISHED_CARD_HOLD_AFTER_ANIMATION_MS);

      return;
    }

    setOpponentCharacterAnim("idle");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-900 text-white">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <SceneRenderer
          characterAnimations={{
            opponent: opponentCharacterAnim,
            player: characterAnim,
          }}
          characterOverlays={
            fishedCardRank === null
              ? undefined
              : {
                player: ({ computedScale }) => (
                  <div className="drop-shadow-[0_5px_7px_rgba(0,0,0,0.35)]">
                    <CardSprite
                      atlas="ui"
                      rank={fishedCardRank}
                      scale={Math.min(
                        1.1,
                        Math.max(0.65, computedScale * 0.34),
                      )}
                    />
                  </div>
                ),
              }
          }
          characterRunIds={{
            opponent: opponentCharacterRunId,
            player: characterRunId,
          }}
          className="h-full w-full"
          decorationOverrides={
            isChestOpen
              ? {
                [CHEST_DECORATION_ID]: CHEST_OPEN_FILE_PATH,
              }
              : undefined
          }
          fit="cover"
          onCharacterAnimationComplete={handleSceneCharacterAnimationComplete}
          renderSceneOverlay={({ computedScale, tilePx }) =>
            renderBookCountSceneOverlay({
              computedScale,
              opponentBookCount: state.books[opponent].length,
              playerBookCount: state.books[viewerPlayer].length,
              tilePx,
            })
          }
          scene={scene}
        />
      </div>

      {renderAskScreenOverlay(askEffect)}
      {renderHandPopOverlay(handPopRank)}
      {renderStolenCardFlickOverlay(stolenCardEffect)}

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center select-none text-8xl font-normal leading-none tracking-normal"
        style={{
          color: "rgba(0, 0, 0, 0.3)",
          fontFamily: '"Departure Mono", var(--font-mono), monospace',
        }}
      >
        {state.pool.length}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 px-2 pb-4 sm:px-5 sm:pb-6">
        <div
          aria-label="Your hand"
          className="mx-auto flex max-w-full items-end justify-center overflow-x-auto px-4 pb-2 pt-8"
        >
          {sortedHand.map((card) => (
            <div
              className={overlapClass}
              data-hand-pop-rank={
                handPopRank === card.rank ? card.rank : undefined
              }
              key={card.id}
              style={
                handPopRank === card.rank
                  ? {
                    animation: `card-hand-pop ${HAND_POP_DURATION_MS}ms ease-out`,
                  }
                  : undefined
              }
            >
              <CardSprite
                disabled={!canAsk}
                onClick={() => {
                  if (!canAsk) return;
                  onAskForCard(card.rank);
                }}
                rank={card.rank}
                scale={1}
              />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
