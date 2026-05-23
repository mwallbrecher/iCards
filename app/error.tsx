"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-emerald-800 px-4 py-8 text-white">
      <section className="w-full max-w-md rounded-md bg-white p-6 text-center text-gray-950 shadow-xl">
        <h1 className="text-3xl font-bold tracking-normal">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm text-gray-600">
          An unexpected error occurred. Try again in a moment.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-md bg-emerald-700 px-4 py-3 font-bold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-md border border-emerald-700 px-4 py-3 font-bold text-emerald-800 transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            Go home
          </Link>
        </div>
      </section>
    </main>
  );
}
