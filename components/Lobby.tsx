"use client";

import { useState } from "react";

type LobbyProps = {
  code: string;
  viewerName: string;
};

export function Lobby({ code, viewerName }: LobbyProps) {
  const [copied, setCopied] = useState(false);

  async function copyInviteLink() {
    const inviteLink = `${window.location.origin}/game/${code}`;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    window.setTimeout(() => {
      setCopied(false);
    }, 1800);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-emerald-800 px-4 py-8 text-white">
      <section className="w-full max-w-md space-y-5 rounded-md border border-white/15 bg-white p-6 text-center text-gray-950 shadow-xl">
        <div className="mx-auto h-8 w-8 animate-pulse rounded-full bg-emerald-600" />
        <div>
          <p className="text-sm font-medium text-gray-600">{viewerName}</p>
          <h1 className="mt-1 text-2xl font-bold">Waiting for opponent...</h1>
        </div>
        <div className="rounded-md bg-emerald-50 px-4 py-3 font-mono text-xl font-bold text-emerald-900">
          {code}
        </div>
        <button
          type="button"
          onClick={copyInviteLink}
          className="w-full rounded-md bg-emerald-700 px-4 py-3 font-bold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {copied ? "Copied!" : "Copy invite link"}
        </button>
        <p className="text-sm text-gray-600">
          Share this link with your opponent to start.
        </p>
      </section>
    </main>
  );
}
