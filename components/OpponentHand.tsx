import { CardBack } from "@/components/CardBack";

type OpponentHandProps = {
  count: number;
  thinking?: boolean;
};

export function OpponentHand({ count, thinking = false }: OpponentHandProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="flex min-h-24 items-center justify-center px-2"
        aria-label={`Bot has ${count} cards`}
      >
        {count === 0 ? (
          <div className="rounded-md border border-dashed border-white/35 px-4 py-5 text-sm text-emerald-50/80">
            No cards
          </div>
        ) : (
          Array.from({ length: count }, (_, index) => (
            <div key={index} className="-ml-8 first:ml-0">
              <CardBack />
            </div>
          ))
        )}
      </div>
      {thinking ? (
        <div className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white shadow-sm ring-1 ring-white/20">
          Bot thinking<span className="animate-pulse">...</span>
        </div>
      ) : null}
    </div>
  );
}
