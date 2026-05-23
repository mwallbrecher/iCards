import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-emerald-800 px-4 py-8 text-white">
      <section className="w-full max-w-md rounded-md bg-white p-6 text-center text-gray-950 shadow-xl">
        <h1 className="text-3xl font-bold tracking-normal">Game not found</h1>
        <p className="mt-3 text-sm text-gray-600">
          This game code doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md bg-emerald-700 px-4 py-3 font-bold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          Start a new game
        </Link>
      </section>
    </main>
  );
}
