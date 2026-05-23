"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { joinGameByCodeAction } from "@/lib/games/gofish/actions";

type JoinGameClientProps = {
  code: string;
};

export function JoinGameClient({ code }: JoinGameClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        const result = await joinGameByCodeAction(code);
        router.replace(`/game/${result.code}`);
      } catch (caught) {
        setError((caught as Error).message);
      }
    });
  }, [code, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-emerald-800 px-4 py-8 text-white">
      <section className="w-full max-w-md rounded-md bg-white p-6 text-center text-gray-950 shadow-xl">
        <h1 className="text-2xl font-bold">
          {error ? "Could not join game" : "Joining game..."}
        </h1>
        <p className="mt-3 text-sm text-gray-600">
          {error ?? (pending ? "Finding your seat." : "Redirecting.")}
        </p>
        {error ? (
          <Link
            href="/"
            className="mt-5 inline-block rounded-md bg-emerald-700 px-4 py-2 font-bold text-white transition hover:bg-emerald-800"
          >
            Back home
          </Link>
        ) : null}
      </section>
    </main>
  );
}
