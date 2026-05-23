"use client";

type RematchPromptProps =
  | {
      mode: "initiate";
      onRequest: () => void;
      onLeave: () => void;
      pending: boolean;
    }
  | {
      mode: "waiting";
      opponentName: string;
      onLeave: () => void;
    }
  | {
      mode: "incoming";
      opponentName: string;
      onAccept: () => void;
      onDecline: () => void;
      pending: boolean;
    };

export function RematchPrompt(props: RematchPromptProps) {
  return (
    <div className="fixed inset-x-4 bottom-4 z-30 mx-auto max-w-md rounded-md border border-white/20 bg-white p-4 text-center text-gray-950 shadow-2xl">
      {props.mode === "initiate" ? (
        <>
          <h2 className="text-xl font-bold">Want to play again?</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={props.onRequest}
              disabled={props.pending}
              className="rounded-md bg-emerald-700 px-4 py-2 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-700/60"
            >
              Rematch
            </button>
            <button
              type="button"
              onClick={props.onLeave}
              disabled={props.pending}
              className="rounded-md border border-gray-300 px-4 py-2 font-bold text-gray-900 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Leave
            </button>
          </div>
        </>
      ) : null}

      {props.mode === "waiting" ? (
        <>
          <h2 className="text-xl font-bold">
            Waiting for {props.opponentName} to accept rematch...
          </h2>
          <button
            type="button"
            onClick={props.onLeave}
            className="mt-4 rounded-md border border-gray-300 px-4 py-2 font-bold text-gray-900 transition hover:bg-gray-50"
          >
            Leave
          </button>
        </>
      ) : null}

      {props.mode === "incoming" ? (
        <>
          <h2 className="text-xl font-bold">
            {props.opponentName} wants a rematch!
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={props.onAccept}
              disabled={props.pending}
              className="rounded-md bg-emerald-700 px-4 py-2 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-700/60"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={props.onDecline}
              disabled={props.pending}
              className="rounded-md border border-gray-300 px-4 py-2 font-bold text-gray-900 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Decline
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
