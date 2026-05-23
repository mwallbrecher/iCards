import { ADJECTIVES, ANIMALS, NOUNS } from "@/lib/codes/wordlist";

/**
 * Generates a game code like "blue-fox-river".
 * Roughly 50^3 = 125,000 combinations per attempt.
 * Caller is responsible for checking uniqueness in the DB and retrying.
 */
export function generateGameCode(rng: () => number = Math.random): string {
  const pick = <T>(items: readonly T[]): T =>
    items[Math.floor(rng() * items.length)] ?? items[0];

  return `${pick(ADJECTIVES)}-${pick(ANIMALS)}-${pick(NOUNS)}`;
}
