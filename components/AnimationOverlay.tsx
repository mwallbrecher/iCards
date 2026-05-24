"use client";

export type AnimPayload =
  | { type: "you-got-cards"; rank: string; count: number }
  | { type: "you-drew"; rank: string | null }
  | { type: "they-asked-miss"; rank: string }
  | { type: "they-asked-hit"; rank: string; count: number }
  | { type: "book-formed"; rank: string };

function AnimCard({ rank, ring }: { rank: string; ring: "green" | "red" }) {
  const ringClass =
    ring === "green"
      ? "ring-2 ring-green-400 ring-offset-1"
      : "ring-2 ring-red-400 ring-offset-1";
  return (
    <div
      className={`relative flex h-16 w-11 shrink-0 select-none items-center justify-center rounded-md border border-gray-300 bg-white font-semibold text-gray-900 shadow-md ${ringClass}`}
    >
      <span className="absolute left-1 top-0.5 text-sm leading-none">{rank}</span>
      <span className="text-2xl text-gray-600">♠</span>
    </div>
  );
}

export function AnimationOverlay({ anim }: { anim: AnimPayload | null }) {
  if (!anim) return null;

  if (anim.type === "you-got-cards") {
    return (
      <div className="pointer-events-none fixed inset-0 z-30 flex items-start justify-center pt-28">
        <div className="animate-slide-from-top flex flex-col items-center gap-3 rounded-2xl bg-green-900/90 px-6 py-4 shadow-2xl backdrop-blur-sm">
          <p className="text-sm font-bold text-green-300">
            ✓ You got {anim.count === 1 ? "it" : `${anim.count} cards`}!
          </p>
          <div className="flex gap-1.5">
            {Array.from({ length: Math.min(anim.count, 4) }, (_, i) => (
              <AnimCard key={i} rank={anim.rank} ring="green" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (anim.type === "you-drew") {
    return (
      <div className="pointer-events-none fixed inset-0 z-30 flex items-start justify-center pt-28">
        <div className="animate-slide-from-top flex flex-col items-center gap-3 rounded-2xl bg-red-900/90 px-6 py-4 shadow-2xl backdrop-blur-sm">
          <p className="text-sm font-bold text-red-300">🎣 Go Fish!</p>
          {anim.rank !== null ? (
            <AnimCard rank={anim.rank} ring="red" />
          ) : (
            <p className="text-xs text-red-200">The pool was empty</p>
          )}
        </div>
      </div>
    );
  }

  if (anim.type === "they-asked-miss") {
    return (
      <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
        <div className="animate-stamp-pop flex flex-col items-center gap-1 rounded-2xl border-4 border-red-500 bg-red-900/90 px-10 py-7 shadow-2xl backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-red-300">
            Asked for
          </p>
          <p className="text-6xl font-black text-white">{anim.rank}s</p>
          <p className="mt-1 text-xl font-bold text-red-400">✗ None!</p>
        </div>
      </div>
    );
  }

  if (anim.type === "they-asked-hit") {
    return (
      <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
        <div className="animate-stamp-pop flex flex-col items-center gap-3 rounded-2xl border-4 border-orange-400 bg-orange-950/90 px-8 py-6 shadow-2xl backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-300">
            Asked for
          </p>
          <p className="text-6xl font-black text-white">{anim.rank}s</p>
          <div className="flex gap-1.5">
            {Array.from({ length: Math.min(anim.count, 4) }, (_, i) => (
              <div key={i} className="animate-card-vanish">
                <AnimCard rank={anim.rank} ring="red" />
              </div>
            ))}
          </div>
          <p className="text-sm font-semibold text-orange-300">Taken!</p>
        </div>
      </div>
    );
  }

  if (anim.type === "book-formed") {
    return (
      <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
        <div className="animate-stamp-pop flex flex-col items-center gap-3 rounded-2xl border-4 border-pink-400 bg-pink-950/95 px-10 py-8 shadow-2xl backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-pink-300">
            Book of {anim.rank}s!
          </p>
          <p className="text-5xl">💖</p>
          <p className="text-center text-2xl font-black text-white">
            I love my girlfriend Lauren
          </p>
        </div>
      </div>
    );
  }

  return null;
}
