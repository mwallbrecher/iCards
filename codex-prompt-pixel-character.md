# Codex Prompt — Pixel Character Component + Game Integration

> Copy this entire prompt into a fresh Codex chat in VS Code. It creates a reusable pixel-art character component, a dev test page, and integrates the character into the live game so it animates on "Go Fish" events.

---

## Task: Build a reusable pixel-art character animation system and wire it into the Go Fish game

### Context
The Go Fish app is live and works on `icards.wallbrecher.io`. We're starting a thematic redesign — Stardew Valley-inspired pier scene. This task is the first piece: a reusable `PixelCharacter` component that renders sprite-sheet animations, plus integration into the game so the viewer's character animates when they go fishing.

Future tasks will add the background scene, the frog character, and additional animations. For now, focus only on what's specified below.

### Asset details
The fisher sprite sheet is provided at:
- **Path:** `public/graphics/characters/fisher_cast.png`
- **Dimensions:** 1050px × 44px
- **Layout:** 21 horizontal frames, 50px × 44px each, no padding between frames
- **Animation:** Full cast-reel-catch sequence
- **Idle state:** Frame 0 (first frame) as a static image

The user has placed this file already. Do not generate or modify the PNG.

---

## Step 1 — Create the PixelCharacter component

Create the file `components/PixelCharacter.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

export type CharacterAnimation = "idle" | "fishing";

type PixelCharacterProps = {
  /** Path to the sprite sheet, e.g. "/graphics/characters/fisher_cast.png" */
  spriteSheet: string;
  /** Width of a single frame in pixels */
  frameWidth: number;
  /** Height of a single frame in pixels */
  frameHeight: number;
  /** Total number of frames in the sheet */
  frameCount: number;
  /** Duration of the full animation cycle, in milliseconds */
  durationMs: number;
  /** Current animation state */
  animation: CharacterAnimation;
  /** Visual scale factor (1 = native size, 2 = double, etc.) */
  scale?: number;
  /** Mirror horizontally (useful for opponent character facing the other way) */
  flipped?: boolean;
  /** Called when a non-looping animation finishes */
  onAnimationComplete?: () => void;
};

/**
 * Renders a pixel-art character using a horizontal sprite sheet.
 * Frames must be laid out left-to-right with no padding.
 *
 * The "idle" state shows frame 0 as a static image.
 * The "fishing" state plays the full sheet once, then calls onAnimationComplete.
 *
 * Reusable for any character with a horizontal sprite sheet — fisher today,
 * frog tomorrow, anything in the future.
 */
export function PixelCharacter({
  spriteSheet,
  frameWidth,
  frameHeight,
  frameCount,
  durationMs,
  animation,
  scale = 2,
  flipped = false,
  onAnimationComplete,
}: PixelCharacterProps) {
  // Re-mount on animation change so CSS animation restarts cleanly.
  // Without this, switching idle → fishing → idle wouldn't replay.
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    if (animation === "fishing") {
      setAnimationKey((k) => k + 1);
      const timeout = setTimeout(() => {
        onAnimationComplete?.();
      }, durationMs);
      return () => clearTimeout(timeout);
    }
  }, [animation, durationMs, onAnimationComplete]);

  const displayWidth = frameWidth * scale;
  const displayHeight = frameHeight * scale;
  const sheetWidth = frameWidth * frameCount * scale;

  const baseStyle: React.CSSProperties = {
    width: displayWidth,
    height: displayHeight,
    backgroundImage: `url(${spriteSheet})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${sheetWidth}px ${displayHeight}px`,
    // Pixel-art crispness: no blurry interpolation when scaled
    imageRendering: "pixelated",
    transform: flipped ? "scaleX(-1)" : undefined,
  };

  if (animation === "idle") {
    return <div style={{ ...baseStyle, backgroundPosition: "0 0" }} />;
  }

  // "fishing" — play the full sheet once with discrete frame steps
  const lastFrameOffset = -(frameWidth * (frameCount - 1) * scale);

  return (
    <>
      <style>{`
        @keyframes character-fishing-${animationKey} {
          from { background-position: 0 0; }
          to { background-position: ${lastFrameOffset}px 0; }
        }
      `}</style>
      <div
        key={animationKey}
        style={{
          ...baseStyle,
          animation: `character-fishing-${animationKey} ${durationMs}ms steps(${frameCount}) forwards`,
        }}
      />
    </>
  );
}
```

### Notes on the implementation
- `steps(frameCount)` is the critical CSS function: it makes background-position jump in N discrete steps instead of interpolating smoothly. This gives the classic pixel-art frame-by-frame look.
- `imageRendering: "pixelated"` prevents browser blur when scaling up. Safari sometimes needs `crisp-edges` as fallback — if pixels look blurry on iPhone, add `image-rendering: crisp-edges` as a sibling property.
- The `animationKey` + `key={animationKey}` pattern forces React to unmount and remount the div when the animation should restart, so going idle → fishing → idle → fishing replays cleanly each time.
- The component is universal: same code will be reused for the frog character later by passing different props.

---

## Step 2 — Create a dev test page

Create `app/dev/sprites/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { PixelCharacter, type CharacterAnimation } from "@/components/PixelCharacter";

export default function SpriteDevPage() {
  const [anim, setAnim] = useState<CharacterAnimation>("idle");

  return (
    <main className="min-h-screen bg-sky-200 p-8 flex flex-col items-center gap-8">
      <h1 className="text-2xl font-bold text-sky-900">Sprite test</h1>
      <p className="text-sm text-sky-800">
        Use this page to verify sprite animations work correctly before
        wiring them into the game.
      </p>

      <PixelCharacter
        spriteSheet="/graphics/characters/fisher_cast.png"
        frameWidth={50}
        frameHeight={44}
        frameCount={21}
        durationMs={2100}
        animation={anim}
        scale={4}
        onAnimationComplete={() => setAnim("idle")}
      />

      <div className="flex gap-4">
        <button
          className="px-4 py-2 bg-emerald-700 text-white rounded font-semibold hover:bg-emerald-600 transition"
          onClick={() => setAnim("fishing")}
        >
          Play fishing animation
        </button>
        <button
          className="px-4 py-2 bg-gray-700 text-white rounded font-semibold hover:bg-gray-600 transition"
          onClick={() => setAnim("idle")}
        >
          Reset to idle
        </button>
      </div>

      <div className="text-xs text-sky-900 max-w-md text-center">
        <p>Current state: <code className="bg-white px-1 rounded">{anim}</code></p>
        <p className="mt-2">
          Expected: clicking "Play" advances through 21 frames over 2.1 seconds,
          then snaps back to frame 0.
        </p>
      </div>
    </main>
  );
}
```

This page is for development verification only. It is NOT linked from the main landing page — only accessible by typing the URL `/dev/sprites`.

---

## Step 3 — Wire PixelCharacter into the live game

Modify `components/GameView.tsx`. Specifically:

### 3a. Imports
Add at the top of the file:
```tsx
import { useEffect, useRef, useState } from "react";
import { PixelCharacter, type CharacterAnimation } from "@/components/PixelCharacter";
```

(If `useEffect`, `useRef`, or `useState` are already imported, merge — don't duplicate.)

### 3b. State for character animation
Inside the `GameView` component, near the top:

```tsx
const [characterAnim, setCharacterAnim] = useState<CharacterAnimation>("idle");
const lastSeenHistoryLengthRef = useRef(state.history.length);
```

### 3c. Effect: detect new goFish events for the viewer
Add this `useEffect` inside the component:

```tsx
useEffect(() => {
  const prevLength = lastSeenHistoryLengthRef.current;
  const newEvents = state.history.slice(prevLength);
  lastSeenHistoryLengthRef.current = state.history.length;

  // Only animate when THIS viewer goes fishing — not the opponent
  const viewerWentFishing = newEvents.some(
    (event) => event.type === "goFish" && event.player === viewerPlayer,
  );

  if (viewerWentFishing) {
    setCharacterAnim("fishing");
  }
}, [state.history, viewerPlayer]);
```

### 3d. Render the character
Find the section in the JSX where the viewer's hand is rendered (the section with `<Hand cards={state.hands[viewerPlayer]} ... />`). Add the character rendering **just above** the "Your hand" header, with a container that gives it space:

```tsx
<div className="flex justify-center my-4">
  <PixelCharacter
    spriteSheet="/graphics/characters/fisher_cast.png"
    frameWidth={50}
    frameHeight={44}
    frameCount={21}
    durationMs={2100}
    animation={characterAnim}
    scale={3}
    onAnimationComplete={() => setCharacterAnim("idle")}
  />
</div>
```

### Key behavior requirements
- Only the viewer's character is rendered. Each device shows only its own character.
- Only `goFish` events where `event.player === viewerPlayer` trigger the animation. Opponent's `goFish` events are ignored.
- On initial mount, `lastSeenHistoryLengthRef.current` is set to the current history length, so existing events do NOT trigger the animation when the page loads (e.g. when reconnecting mid-game).
- After the animation finishes (2100ms), it returns to idle automatically via `onAnimationComplete`.
- If multiple `goFish` events arrive in quick succession (rare but possible), each restarts the animation cleanly thanks to the `animationKey` mechanism.

---

## Step 4 — Verify

After implementation, run:

```bash
npm run lint
npm run build
npm run test:run
```

All three must pass. Then manually test:

### Test plan
1. **Dev test page first** — visit `http://localhost:3000/dev/sprites`. Click "Play fishing animation".
   - Expected: character animates through 21 frames over 2.1s, snaps back to idle.
   - If the animation looks wrong (frames jump weirdly, or stays static): the frame count or sprite-sheet dimensions are wrong. Stop and report back.

2. **Bot mode** — visit `/game?bot=true`. Play a game. When the bot says "Go Fish" to one of your asks (i.e. they don't have the rank, and you draw from the pool):
   - Expected: your character animates the fishing sequence.
   - When the bot itself has to go fishing: your character does NOT animate.

3. **Two-browser real game** — open two browsers, create a game, join with the other. Play. When player A goes fishing in their own browser, only A's browser animates the character. B's browser does not animate (because B's viewer is B, and the event's player is A).

4. **Reload mid-game** — refresh the browser mid-game. Existing `goFish` events in history should NOT trigger animations on reload. Only events that arrive AFTER the page is mounted should trigger.

---

## Acceptance criteria
- [ ] `components/PixelCharacter.tsx` exists with the exact API specified.
- [ ] `app/dev/sprites/page.tsx` exists and the animation plays correctly there.
- [ ] `components/GameView.tsx` renders the character above the player's hand, animates only on viewer's own goFish events.
- [ ] `npm run lint` clean.
- [ ] `npm run build` succeeds.
- [ ] `npm run test:run` green (all existing tests still pass).
- [ ] Bot mode works as described in test plan.
- [ ] Live multiplayer mode works as described in test plan.
- [ ] No console errors during animation playback.

---

## Non-goals
- ❌ No background pier/water — separate future task.
- ❌ No frog character — that's a separate future task, will reuse this same component.
- ❌ No card-flying animations on successful asks.
- ❌ No sound effects.
- ❌ No character positioning relative to a pier — for now just centered horizontally above the hand. Positioning will be refined when the background lands.
- ❌ Do not modify the Hand, OpponentHand, Pool, Books, EventLog, or GameOverBanner components.
- ❌ Do not change game logic in `lib/games/gofish/`.

---

## Wrap-up
- Suggested commit: `feat: add PixelCharacter component and wire fishing animation into game`
- Brief summary in your response back: what file paths were created/modified, did all tests pass, anything unexpected.
