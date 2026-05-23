import type { Card as CoreCard } from "@/lib/core/card";
import { Card } from "@/components/Card";

type BooksProps = {
  books: CoreCard[][];
  ownerLabel: string;
};

export function Books({ books, ownerLabel }: BooksProps) {
  const heading =
    ownerLabel === "You" ? `Your books: ${books.length}` : `${ownerLabel}'s books: ${books.length}`;

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-emerald-50">
        {heading}
      </h2>
      <div className="flex min-h-20 items-center gap-2 overflow-x-auto">
        {books.length === 0 ? (
          <div className="rounded-md border border-dashed border-white/30 px-3 py-4 text-sm text-emerald-50/70">
            No books
          </div>
        ) : (
          books.map((book) => {
            const representative = book[0];
            if (representative === undefined) {
              return null;
            }

            return (
              <div key={representative.rank} className="flex items-center gap-1">
                <Card card={representative} size="sm" />
                <span className="text-xs font-semibold text-emerald-50">
                  x4
                </span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
