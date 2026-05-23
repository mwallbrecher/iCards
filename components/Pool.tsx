import { CardBack } from "@/components/CardBack";

type PoolProps = {
  count: number;
};

export function Pool({ count }: PoolProps) {
  const visibleCards = Math.min(3, count);

  return (
    <div className="flex flex-col items-center gap-2" aria-label={`Pool has ${count} cards`}>
      <div className="relative h-28 w-24">
        {count === 0 ? (
          <div className="flex h-24 w-16 items-center justify-center rounded-md border border-dashed border-white/35 text-center text-xs text-emerald-50/80">
            Pool empty
          </div>
        ) : (
          Array.from({ length: visibleCards }, (_, index) => (
            <div
              key={index}
              className="absolute"
              style={{
                left: `${index * 8}px`,
                top: `${index * 5}px`,
              }}
            >
              <CardBack />
            </div>
          ))
        )}
      </div>
      <div className="text-sm font-medium text-emerald-50">
        {count === 0 ? "Pool empty" : `Pool: ${count} cards left`}
      </div>
    </div>
  );
}
