import type { Card } from "@/types/card";

/**
 * Deterministic option shuffling for quiz cards.
 *
 * Hand-written quizzes cluster the right answer in one slot (most authors put
 * it second), which quietly teaches "just tap B". Shuffling at load time fixes
 * that without editing content. It is seeded by the card id, so a card always
 * shows the same order — saves, reviews and re-renders stay consistent.
 */

/** FNV-1a: a small, stable string hash. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: a tiny seeded PRNG returning floats in [0, 1). */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Returns a quiz card with its options shuffled and answer remapped. Other cards pass through. */
export function shuffleQuiz<T extends Card>(card: T): T {
  if (card.type !== "quiz") return card;
  const rng = seededRng(hashString(card.id));
  const order = card.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    ...card,
    options: order.map((i) => card.options[i]),
    answer: order.indexOf(card.answer),
  };
}
