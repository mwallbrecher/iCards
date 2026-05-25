"use client";

import { useState } from "react";
import {
  PixelCharacter,
  type CharacterAnimation,
} from "@/components/PixelCharacter";

export default function SpriteDevPage() {
  const [anim, setAnim] = useState<CharacterAnimation>("idle");

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 bg-sky-200 p-8">
      <h1 className="text-2xl font-bold tracking-normal text-sky-900">
        Sprite test
      </h1>
      <p className="text-sm text-sky-800">
        Use this page to verify sprite animations work correctly before wiring
        them into the game.
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
          className="rounded bg-emerald-700 px-4 py-2 font-semibold text-white transition hover:bg-emerald-600"
          onClick={() => setAnim("fishing")}
          type="button"
        >
          Play fishing animation
        </button>
        <button
          className="rounded bg-gray-700 px-4 py-2 font-semibold text-white transition hover:bg-gray-600"
          onClick={() => setAnim("idle")}
          type="button"
        >
          Reset to idle
        </button>
      </div>

      <div className="max-w-md text-center text-xs text-sky-900">
        <p>
          Current state: <code className="rounded bg-white px-1">{anim}</code>
        </p>
        <p className="mt-2">
          Expected: clicking &quot;Play&quot; advances through 21 frames over 2.1
          seconds, then snaps back to frame 0.
        </p>
      </div>
    </main>
  );
}
