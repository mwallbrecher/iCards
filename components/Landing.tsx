"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createGameAction,
  joinGameAction,
} from "@/lib/games/gofish/actions";

export function Landing() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const { code } = await createGameAction(formData);
        router.push(`/game/${code}`);
      } catch (caught) {
        setError((caught as Error).message);
      }
    });
  }

  function handleJoin(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const { code } = await joinGameAction(formData);
        router.push(`/game/${code}`);
      } catch (caught) {
        setError((caught as Error).message);
      }
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-emerald-800 px-4 py-8 text-white">
      <div className="w-full max-w-3xl space-y-6">
        <header className="text-center">
          <h1 className="text-4xl font-bold tracking-normal">GoFish!</h1>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <form
            action={handleCreate}
            className="space-y-4 rounded-md border border-white/15 bg-white p-5 text-gray-950 shadow-xl"
          >
            <div>
              <h2 className="text-xl font-bold">Play vs. Friends</h2>
            </div>
            <label className="block space-y-1 text-sm font-medium">
              <span>Display name</span>
              <input
                name="displayName"
                type="text"
                autoComplete="nickname"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-md bg-emerald-700 px-4 py-3 font-bold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-700/60"
            >
              Create Game
            </button>
          </form>

          <form
            action={handleJoin}
            className="space-y-4 rounded-md border border-white/15 bg-white p-5 text-gray-950 shadow-xl"
          >
            <div>
              <h2 className="text-xl font-bold">Join with code</h2>
            </div>
            <label className="block space-y-1 text-sm font-medium">
              <span>Game code</span>
              <input
                name="code"
                type="text"
                required
                autoComplete="off"
                placeholder="blue-fox-river"
                className="w-full rounded-md border border-gray-300 px-3 py-2 lowercase focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </label>
            <label className="block space-y-1 text-sm font-medium">
              <span>Display name</span>
              <input
                name="displayName"
                type="text"
                autoComplete="nickname"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-md bg-emerald-700 px-4 py-3 font-bold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-700/60"
            >
              Join game
            </button>
          </form>
        </div>

        {error ? (
          <p className="rounded-md bg-red-600 px-4 py-3 text-center text-sm font-semibold text-white">
            {error}
          </p>
        ) : null}

        <div className="text-center">
          <Link
            href="/game?bot=true"
            className="text-sm font-semibold text-emerald-50 underline-offset-4 hover:underline"
          >
            Play vs bot
          </Link>
        </div>
      </div>
    </main>
  );
}
