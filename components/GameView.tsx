"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";
import type { Card as CoreCard, Rank } from "@/lib/core/card";
import { SUITS } from "@/lib/core/card";
import type { GoFishState, PlayerId } from "@/lib/games/gofish";
import {
  CARD_HEIGHT,
  CARD_RANK_ORDER,
  CARD_WIDTH,
  CardSprite,
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

// ─── Timing ──────────────────────────────────────────────────────────────────

const ASKING_LABEL_MS = 460;
const MISS_LABEL_MS = 420;
const FISHED_CARD_REVEAL_DELAY_MS = Math.round(SCENE_CHARACTER_FISHING_DURATION_MS * 0.8);
const FISHED_CARD_HOLD_MS = 820;
const CARD_FLY_MS = 680;
const CARD_LAND_MS = 580;
const BOOK_POP_MS = 500;
const CHEST_DECORATION_ID = "land-chest";
const CHEST_OPEN_FILE_PATH = "/graphics/decorations/land/chest/land-chest-1.png";

export const ASK_SUCCESS_ANIMATION_TOTAL_MS =
  ASKING_LABEL_MS + CARD_FLY_MS + CARD_LAND_MS + BOOK_POP_MS;
export const ASK_MISS_ANIMATION_TOTAL_MS =
  ASKING_LABEL_MS +
  MISS_LABEL_MS +
  SCENE_CHARACTER_FISHING_DURATION_MS +
  FISHED_CARD_HOLD_MS +
  CARD_FLY_MS +
  CARD_LAND_MS +
  BOOK_POP_MS;

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase =
  | { tag: "idle" }
  | { tag: "asking"; id: string; rank: Rank; asker: "player" | "opponent" }
  | { tag: "miss"; id: string }
  | { tag: "fishing"; id: string; who: "player" | "opponent"; drewRank: Rank | null }
  | { tag: "transfer"; id: string; rank: Rank; count: number; from: "opponent" | "pool" }
  | { tag: "steal"; id: string; rank: Rank; count: number }
  | { tag: "book-pop"; id: string; rank: Rank; who: "player" | "opponent" };

type FlyState = {
  id: string;
  rank: Rank;
  count: number;
  sx: number;
  sy: number;
  dx: number;
  dy: number;
  goingUp: boolean;
};

export type GameViewProps = {
  state: GoFishState;
  viewerPlayer: PlayerId;
  isViewerTurn: boolean;
  onAskForCard: (rank: Rank) => void;
};

type AskEv = Extract<GoFishState["history"][number], { type: "ask" }>;
type GoFishEv = Extract<GoFishState["history"][number], { type: "goFish" }>;
type BookEv = Extract<GoFishState["history"][number], { type: "bookFormed" }>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function otherPlayer(p: PlayerId): PlayerId {
  return p === "A" ? "B" : "A";
}

function toSceneChar(player: PlayerId, viewer: PlayerId): "player" | "opponent" {
  return player === viewer ? "player" : "opponent";
}

function toRank(s: string | null | undefined): Rank | null {
  return s && CARD_RANK_ORDER.includes(s as Rank) ? (s as Rank) : null;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 8);
}

function sortCards(cards: CoreCard[]): CoreCard[] {
  return [...cards].sort((a, b) => {
    const rd = CARD_RANK_ORDER.indexOf(a.rank) - CARD_RANK_ORDER.indexOf(b.rank);
    return rd !== 0 ? rd : SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
  });
}

function rectCenter(r: DOMRect): { x: number; y: number } {
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

// ─── FlyingCard ───────────────────────────────────────────────────────────────

function FlyingCard({ fly, onDone }: { fly: FlyState; onDone: () => void }) {
  const [live, setLive] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setLive(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(onDone, CARD_FLY_MS + 60);
    return () => window.clearTimeout(t);
  }, [onDone]);

  const ddx = fly.dx - fly.sx;
  const ddy = fly.dy - fly.sy;

  const style = {
    position: "fixed" as const,
    left: fly.sx - CARD_WIDTH / 2,
    top: fly.sy - CARD_HEIGHT / 2,
    zIndex: 50,
    pointerEvents: "none" as const,
    willChange: "transform",
    "--fly-dx": `${ddx}px`,
    "--fly-dy": `${ddy}px`,
    "--fly-arc": fly.goingUp ? "-55px" : "78px",
    "--fly-spin": fly.goingUp ? "5deg" : "-4deg",
    animation: live
      ? `card-fly ${CARD_FLY_MS}ms cubic-bezier(0.25,0.46,0.45,0.94) forwards`
      : undefined,
  } as CSSProperties;

  return (
    <div style={style}>
      <div
        className="drop-shadow-[0_8px_14px_rgba(0,0,0,0.45)]"
        style={{ position: "relative" }}
      >
        <CardSprite atlas="hand" rank={fly.rank} scale={1} />
        {fly.count > 1 && (
          <div
            style={{
              position: "absolute",
              top: -8,
              right: -8,
              background: "rgba(255,255,255,0.88)",
              color: "rgba(0,0,0,0.82)",
              fontFamily: '"Departure Mono", monospace',
              fontSize: 13,
              lineHeight: 1,
              padding: "3px 5px",
              borderRadius: 3,
              imageRendering: "pixelated",
            }}
          >
            x{fly.count}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PhaseLabel ───────────────────────────────────────────────────────────────

function PhaseLabel({
  id,
  ms,
  children,
}: {
  id: string;
  ms: number;
  children: ReactNode;
}) {
  return (
    <div
      key={id}
      aria-hidden
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center select-none"
      style={{ top: "40%", transform: "translateY(-50%)" }}
    >
      <div
        style={{
          animation: `label-in-out ${ms}ms ease-out forwards`,
          fontFamily: '"Departure Mono", var(--font-mono), monospace',
          imageRendering: "pixelated",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function AskLabel({
  rank,
  asker,
}: {
  rank: Rank;
  asker: "player" | "opponent";
}) {
  const isPlayer = asker === "player";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: isPlayer ? "rgba(20,70,40,0.86)" : "rgba(80,25,15,0.86)",
        border: `2px solid ${isPlayer ? "rgba(80,200,120,0.45)" : "rgba(220,80,60,0.45)"}`,
        borderRadius: 8,
        padding: "8px 14px",
        backdropFilter: "blur(6px)",
      }}
    >
      <CardSprite atlas="ui" rank={rank} scale={0.62} />
      <span
        style={{
          color: isPlayer ? "rgba(160,240,190,0.95)" : "rgba(255,170,150,0.95)",
          fontSize: 14,
        }}
      >
        {isPlayer ? "You want" : "Opponent wants"}
      </span>
    </div>
  );
}

function MissLabel() {
  return (
    <div
      style={{
        background: "rgba(20,35,75,0.86)",
        border: "2px solid rgba(100,130,220,0.45)",
        borderRadius: 8,
        padding: "9px 20px",
        backdropFilter: "blur(6px)",
        color: "rgba(150,185,255,0.95)",
        fontSize: 16,
      }}
    >
      Go Fish!
    </div>
  );
}

// ─── BookCountOverlay ─────────────────────────────────────────────────────────

function BookCountOverlay({
  computedScale,
  tilePx,
  playerCount,
  opponentCount,
  popKey,
}: {
  computedScale: number;
  tilePx: number;
  playerCount: number;
  opponentCount: number;
  popKey: string | null;
}) {
  const fontSize = Math.round(Math.min(72, Math.max(30, computedScale * 20)));
  const entries: Array<{ id: SceneCharacterId; count: number }> = [
    { id: "opponent", count: opponentCount },
    { id: "player", count: playerCount },
  ];

  return (
    <>
      {entries.map(({ id, count }) => {
        const placement = SCENE_CHARACTER_PLACEMENTS[id];
        if (!placement.enabled) return null;
        const cx = Math.round(placement.tileX * tilePx);
        const cy = Math.round(placement.tileY * tilePx);
        const cw = 50 * computedScale;
        const ch = 44 * computedScale;
        const gap = Math.max(8, Math.round(5 * computedScale));
        const placeRight = placement.direction === "right";

        return (
          <div
            aria-hidden
            key={id}
            data-book-count={count}
            data-book-count-character-id={id}
            style={{
              color: "rgba(0,0,0,0.42)",
              fontFamily: '"Departure Mono", var(--font-mono), monospace',
              fontSize,
              fontWeight: 400,
              left: Math.round(placeRight ? cx + cw + gap : cx - gap),
              lineHeight: 1,
              pointerEvents: "none",
              position: "absolute",
              textShadow: "0 1px 0 rgba(255,255,255,0.16)",
              top: Math.round(cy + ch * 0.46),
              transform: placeRight ? "translateY(-50%)" : "translate(-100%,-50%)",
              zIndex: 14,
            }}
          >
            <span
              key={`${id}-${count}-${popKey ?? ""}`}
              style={{
                display: "inline-block",
                animation: popKey ? `counter-pop 420ms ease-out` : undefined,
              }}
            >
              {count}
            </span>
          </div>
        );
      })}
    </>
  );
}

// ─── GameView ─────────────────────────────────────────────────────────────────

export function GameView({
  state,
  viewerPlayer,
  isViewerTurn,
  onAskForCard,
}: GameViewProps) {
  const opponent = otherPlayer(viewerPlayer);
  const scene = useMemo(() => generateScene("default"), []);

  // Phase queue — queueRef is the pending list; currentPhase drives renders
  const queueRef = useRef<Phase[]>([]);
  const [currentPhase, setCurrentPhase] = useState<Phase>({ tag: "idle" });

  // Character run IDs — increment to restart non-looping sprite animations
  const [charRunId, setCharRunId] = useState(0);
  const [oppRunId, setOppRunId] = useState(0);

  // Card shown on the fishing line above player character
  const [fishedRank, setFishedRank] = useState<Rank | null>(null);
  const fishedRankRef = useRef<Rank | null>(null);
  const [isChestOpen, setIsChestOpen] = useState(false);

  // Flying card in transit
  const [flyState, setFlyState] = useState<FlyState | null>(null);

  // Display state — decoupled from game state so cards only appear when they "arrive"
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());
  const committedIdsRef = useRef<Set<string>>(
    new Set(state.hands[viewerPlayer].map((c) => c.id)),
  );
  const [landingRank, setLandingRank] = useState<Rank | null>(null);
  const [displayPlayerBooks, setDisplayPlayerBooks] = useState(
    state.books[viewerPlayer].length,
  );
  const [displayOpponentBooks, setDisplayOpponentBooks] = useState(
    state.books[opponent].length,
  );
  const [bookPopKey, setBookPopKey] = useState<string | null>(null);

  // History cursor
  const lastSeenLenRef = useRef(state.history.length);

  // Position anchors (invisible fixed divs for measuring fly source/dest)
  const opponentAnchorRef = useRef<HTMLDivElement>(null);
  const poolAnchorRef = useRef<HTMLDivElement>(null);
  const handAnchorRef = useRef<HTMLDivElement>(null);

  // Always-current state snapshot for use in callbacks
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ── Phase advancement ────────────────────────────────────────────────────

  const advancePhase = useCallback(() => {
    const next = queueRef.current.shift() ?? { tag: "idle" as const };
    setCurrentPhase(next);
  }, []);

  // ── Queue launcher — also increments run IDs for fishing phases ──────────

  const launchPhaseQueue = useCallback((queue: Phase[]) => {
    if (queue.length === 0) return;
    const fishingPhase = queue.find(
      (p): p is Extract<Phase, { tag: "fishing" }> => p.tag === "fishing",
    );
    if (fishingPhase) {
      if (fishingPhase.who === "player") {
        setCharRunId((n: number) => n + 1);
      } else {
        setOppRunId((n: number) => n + 1);
      }
    }
    queueRef.current = queue.slice(1);
    setCurrentPhase(queue[0]);
  }, []);

  // ── Derived character animation state ────────────────────────────────────

  const charAnim: CharacterAnimation =
    currentPhase.tag === "fishing" && currentPhase.who === "player"
      ? "fishing"
      : "idle";
  const oppAnim: CharacterAnimation =
    currentPhase.tag === "fishing" && currentPhase.who === "opponent"
      ? "fishing"
      : "idle";

  // ── Anchor helpers ───────────────────────────────────────────────────────

  const getCenter = useCallback(
    (ref: RefObject<HTMLDivElement | null>): { x: number; y: number } => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      return rectCenter(r);
    },
    [],
  );

  // ── Phase effects ────────────────────────────────────────────────────────

  useEffect(() => {
    const phase = currentPhase;
    if (phase.tag === "idle") return;

    if (phase.tag === "asking") {
      const t = window.setTimeout(advancePhase, ASKING_LABEL_MS);
      return () => window.clearTimeout(t);
    }

    if (phase.tag === "miss") {
      const t = window.setTimeout(advancePhase, MISS_LABEL_MS);
      return () => window.clearTimeout(t);
    }

    if (phase.tag === "fishing") {
      const timers: number[] = [];
      if (phase.who === "player" && phase.drewRank !== null) {
        timers.push(
          window.setTimeout(
            () => setIsChestOpen(true),
            Math.max(0, FISHED_CARD_REVEAL_DELAY_MS - 50),
          ),
        );
        timers.push(
          window.setTimeout(() => {
            fishedRankRef.current = phase.drewRank;
            setFishedRank(phase.drewRank);
          }, FISHED_CARD_REVEAL_DELAY_MS),
        );
      }
      return () => timers.forEach((t) => window.clearTimeout(t));
    }

    if (phase.tag === "transfer") {
      // Hide incoming cards from display hand until they visually arrive
      const incoming = stateRef.current.hands[viewerPlayer]
        .filter((c) => !committedIdsRef.current.has(c.id))
        .map((c) => c.id);
      setPendingIds(new Set(incoming));

      const src =
        phase.from === "opponent"
          ? getCenter(opponentAnchorRef)
          : getCenter(poolAnchorRef);
      const dst = getCenter(handAnchorRef);
      setFlyState({
        id: phase.id,
        rank: phase.rank,
        count: phase.count,
        sx: src.x,
        sy: src.y,
        dx: dst.x,
        dy: dst.y,
        goingUp: false,
      });
      // Completion handled by handleFlyDone
      return;
    }

    if (phase.tag === "steal") {
      // Stolen cards are already gone from game state; just animate a ghost flying up
      const src = getCenter(handAnchorRef);
      const dst = getCenter(opponentAnchorRef);
      setFlyState({
        id: phase.id,
        rank: phase.rank,
        count: phase.count,
        sx: src.x,
        sy: src.y,
        dx: dst.x,
        dy: dst.y,
        goingUp: true,
      });
      committedIdsRef.current = new Set(
        stateRef.current.hands[viewerPlayer].map((c) => c.id),
      );
      return;
    }

    if (phase.tag === "book-pop") {
      const popKey = uid();
      setBookPopKey(popKey);
      if (phase.who === "player") {
        setDisplayPlayerBooks(stateRef.current.books[viewerPlayer].length);
      } else {
        setDisplayOpponentBooks(stateRef.current.books[opponent].length);
      }
      const t = window.setTimeout(advancePhase, BOOK_POP_MS);
      return () => window.clearTimeout(t);
    }
  }, [currentPhase, advancePhase, getCenter, viewerPlayer, opponent]);

  // ── Flying card done ─────────────────────────────────────────────────────

  const handleFlyDone = useCallback(() => {
    const phase = currentPhase;
    setFlyState(null);

    if (phase.tag === "transfer") {
      setPendingIds(new Set());
      committedIdsRef.current = new Set(
        stateRef.current.hands[viewerPlayer].map((c) => c.id),
      );
      setLandingRank(phase.rank);
      window.setTimeout(() => {
        setLandingRank(null);
        advancePhase();
      }, CARD_LAND_MS);
      return;
    }

    if (phase.tag === "steal") {
      advancePhase();
    }
  }, [currentPhase, advancePhase, viewerPlayer]);

  // ── Character animation complete ─────────────────────────────────────────

  const handleCharAnimDone = useCallback(
    (characterId: SceneCharacterId) => {
      if (characterId === "player") {
        window.setTimeout(() => {
          fishedRankRef.current = null;
          setFishedRank(null);
          setIsChestOpen(false);
          advancePhase();
        }, FISHED_CARD_HOLD_MS);
      } else {
        advancePhase();
      }
    },
    [advancePhase],
  );

  // ── History processing ───────────────────────────────────────────────────

  useEffect(() => {
    const prevLen = lastSeenLenRef.current;
    const newEvents = state.history.slice(prevLen);
    lastSeenLenRef.current = state.history.length;
    if (newEvents.length === 0) return;

    const askEv = [...newEvents]
      .reverse()
      .find((e): e is AskEv => e.type === "ask");
    const bookEvs = newEvents.filter((e): e is BookEv => e.type === "bookFormed");

    const queue: Phase[] = [];

    if (askEv) {
      const rank = toRank(askEv.rank);
      if (!rank) return;
      const asker = toSceneChar(askEv.from, viewerPlayer);

      queue.push({ tag: "asking", id: uid(), rank, asker });

      if (askEv.success) {
        if (askEv.from === viewerPlayer) {
          queue.push({
            tag: "transfer",
            id: uid(),
            rank,
            count: askEv.cardsGiven,
            from: "opponent",
          });
        } else {
          queue.push({
            tag: "steal",
            id: uid(),
            rank,
            count: askEv.cardsGiven,
          });
        }
      } else {
        const goFishEv = [...newEvents]
          .reverse()
          .find(
            (e): e is GoFishEv => e.type === "goFish" && e.player === askEv.from,
          );
        queue.push({ tag: "miss", id: uid() });
        if (goFishEv) {
          const drewRank = toRank(goFishEv.drewRank);
          queue.push({ tag: "fishing", id: uid(), who: asker, drewRank });
          if (askEv.from === viewerPlayer && drewRank !== null) {
            queue.push({
              tag: "transfer",
              id: uid(),
              rank: drewRank,
              count: 1,
              from: "pool",
            });
          }
        }
      }
    }

    for (const bookEv of bookEvs) {
      const rank = toRank(bookEv.rank) ?? ("A" as Rank);
      queue.push({
        tag: "book-pop",
        id: uid(),
        rank,
        who: toSceneChar(bookEv.player, viewerPlayer),
      });
    }

    launchPhaseQueue(queue);
  }, [state.history, viewerPlayer, launchPhaseQueue]);

  // ── Derived display ──────────────────────────────────────────────────────

  const displayHand = useMemo(
    () =>
      sortCards(
        state.hands[viewerPlayer].filter((c) => !pendingIds.has(c.id)),
      ),
    [state.hands, viewerPlayer, pendingIds],
  );
  const overlapClass =
    displayHand.length > 10 ? "-ml-9 first:ml-0" : "-ml-6 first:ml-0";

  const hasActiveEffect =
    currentPhase.tag !== "idle" || flyState !== null || landingRank !== null;
  const canAsk =
    isViewerTurn && state.phase !== "gameOver" && !hasActiveEffect;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-900 text-white">
      {/* Scene */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <SceneRenderer
          characterAnimations={{ opponent: oppAnim, player: charAnim }}
          characterOverlays={
            fishedRank === null
              ? undefined
              : {
                  player: ({ computedScale }) => (
                    <div className="drop-shadow-[0_5px_7px_rgba(0,0,0,0.35)]">
                      <CardSprite
                        atlas="ui"
                        rank={fishedRank}
                        scale={Math.min(1.1, Math.max(0.65, computedScale * 0.34))}
                      />
                    </div>
                  ),
                }
          }
          characterRunIds={{ opponent: oppRunId, player: charRunId }}
          className="h-full w-full"
          decorationOverrides={
            isChestOpen
              ? { [CHEST_DECORATION_ID]: CHEST_OPEN_FILE_PATH }
              : undefined
          }
          fit="cover"
          onCharacterAnimationComplete={handleCharAnimDone}
          renderSceneOverlay={({ computedScale, tilePx }) => (
            <BookCountOverlay
              computedScale={computedScale}
              tilePx={tilePx}
              playerCount={displayPlayerBooks}
              opponentCount={displayOpponentBooks}
              popKey={
                currentPhase.tag === "book-pop" ? currentPhase.id : bookPopKey
              }
            />
          )}
          scene={scene}
        />
      </div>

      {/* Position anchors — invisible, used only for getBoundingClientRect() */}
      <div
        ref={opponentAnchorRef}
        aria-hidden
        style={{
          position: "fixed",
          top: "19%",
          left: "21%",
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          pointerEvents: "none",
          zIndex: -1,
        }}
      />
      <div
        ref={poolAnchorRef}
        aria-hidden
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 0,
          height: 0,
          pointerEvents: "none",
          zIndex: -1,
        }}
      />

      {/* Pool count */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center select-none text-8xl font-normal leading-none"
        style={{
          color: "rgba(0,0,0,0.3)",
          fontFamily: '"Departure Mono", var(--font-mono), monospace',
        }}
      >
        {state.pool.length}
      </div>

      {/* Phase labels */}
      {currentPhase.tag === "asking" && (
        <PhaseLabel
          key={currentPhase.id}
          id={currentPhase.id}
          ms={ASKING_LABEL_MS}
        >
          <AskLabel rank={currentPhase.rank} asker={currentPhase.asker} />
        </PhaseLabel>
      )}
      {currentPhase.tag === "miss" && (
        <PhaseLabel
          key={currentPhase.id}
          id={currentPhase.id}
          ms={MISS_LABEL_MS}
        >
          <MissLabel />
        </PhaseLabel>
      )}

      {/* Flying card */}
      {flyState !== null && (
        <FlyingCard key={flyState.id} fly={flyState} onDone={handleFlyDone} />
      )}

      {/* Player hand */}
      <div className="fixed inset-x-0 bottom-0 z-20 px-2 pb-4 sm:px-5 sm:pb-6">
        <div
          ref={handAnchorRef}
          aria-label="Your hand"
          className="mx-auto flex max-w-full items-end justify-center overflow-x-auto px-4 pb-2 pt-8"
        >
          {displayHand.map((card) => (
            <div
              key={card.id}
              className={overlapClass}
              style={
                landingRank === card.rank
                  ? { animation: `card-land ${CARD_LAND_MS}ms ease-out` }
                  : undefined
              }
            >
              <CardSprite
                disabled={!canAsk}
                onClick={canAsk ? () => onAskForCard(card.rank) : undefined}
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
