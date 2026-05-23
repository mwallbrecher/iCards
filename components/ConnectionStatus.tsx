"use client";

export type ConnectionState =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

type ConnectionStatusProps = {
  state: ConnectionState;
};

export function ConnectionStatus({ state }: ConnectionStatusProps) {
  if (state === "connected") {
    return null;
  }

  const label =
    state === "connecting"
      ? "Connecting..."
      : state === "reconnecting"
        ? "Reconnecting..."
        : "Connection lost";
  const bg = state === "error" ? "bg-red-600" : "bg-amber-500";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-full ${bg} px-4 py-1.5 text-sm font-medium text-white shadow-lg`}
    >
      <span
        aria-hidden="true"
        className="inline-block h-2 w-2 animate-pulse rounded-full bg-white"
      />
      <span className="ml-2">{label}</span>
    </div>
  );
}
