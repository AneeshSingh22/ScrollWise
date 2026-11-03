import seed from "@/data/seed-cards.json";
import deep from "@/data/feed/deep.json";
import lifeMath from "@/data/feed/life-math.json";
import tech from "@/data/feed/tech.json";
import world from "@/data/feed/world.json";
import type { Card, IntroCard, SummaryCard } from "@/types/card";
import type { Filter } from "./constants";
import { courseCardById } from "./curriculum";
import { shuffleQuiz } from "./shuffle";

/**
 * The open-ended scroll feed: general knowledge across every topic chip.
 *
 * Each round samples ROUND_SIZE cards from the pool rather than replaying the
 * whole deck, preferring cards the user hasn't seen recently, so "Another
 * round" keeps producing fresh material. Phase 6 replaces this with
 * /api/session (topic weights, Leitner reviews — SPEC section 7); the
 * category-spacing rule here already follows that spec.
 */

export const ROUND_SIZE = 15;

/** Where the math sprint lands in a round (SPEC 7: around position 6-8). */
export const SPRINT_AT = 6;

export const DECK: Card[] = (
  [...seed, ...world, ...tech, ...lifeMath, ...deep] as Card[]
).map(shuffleQuiz);

export const INTRO: IntroCard = { id: "intro", cat: "intro", type: "intro" };
export const SUMMARY: SummaryCard = { id: "summary", cat: "intro", type: "summary" };

/** Review clones get a "-r" suffix; this recovers the original card id. */
export function baseId(id: string): string {
  return id.replace(/-r$/, "");
}

/** Any card by id: feed, course, or the UI-only bookends. */
export function byId(id: string): Card | undefined {
  const base = baseId(id);
  if (base === "intro") return INTRO;
  if (base === "summary") return SUMMARY;
  return DECK.find((c) => c.id === base) ?? courseCardById(base);
}

function shuffled<T>(xs: T[], rng: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Orders candidates freshest-first: never-seen cards in random order, then
 * seen cards from least to most recently seen. `seen` is newest-last.
 */
export function freshnessOrder(cards: Card[], seen: string[], rng: () => number): Card[] {
  const seenAt = new Map(seen.map((id, i) => [id, i]));
  const unseen = shuffled(cards.filter((c) => !seenAt.has(c.id)), rng);
  const old = cards
    .filter((c) => seenAt.has(c.id))
    .sort((a, b) => seenAt.get(a.id)! - seenAt.get(b.id)!);
  return [...unseen, ...old];
}

/**
 * Picks `size` cards in order, never letting one category run more than
 * `maxRun` times in a row when an alternative exists.
 */
export function spaceByCategory(cards: Card[], size: number, maxRun = 2): Card[] {
  const pool = [...cards];
  const out: Card[] = [];
  while (out.length < size && pool.length) {
    const tail = out.slice(-maxRun);
    const blocked =
      tail.length === maxRun && tail.every((c) => c.cat === tail[0].cat) ? tail[0].cat : null;
    let i = pool.findIndex((c) => c.cat !== blocked);
    if (i < 0) i = 0; // only the blocked category is left
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

export function buildRound(
  filter: Filter,
  fewer: string[],
  seen: string[] = [],
  rng: () => number = Math.random,
  size: number = ROUND_SIZE,
): Card[] {
  const inFilter = DECK.filter((c) => filter === "all" || c.cat === filter);
  const sprints = inFilter.filter((c) => c.type === "sprint");
  let cards = freshnessOrder(
    inFilter.filter((c) => c.type !== "sprint"),
    seen,
    rng,
  );

  if (filter === "all" && fewer.length) {
    // "Fewer" halves a muted topic: keep every other card from it.
    const count: Record<string, number> = {};
    cards = cards.filter((c) => {
      if (!fewer.includes(c.cat)) return true;
      count[c.cat] = (count[c.cat] || 0) + 1;
      return count[c.cat] % 2 === 1;
    });
  }

  const wantSprint = sprints.length > 0 && size > SPRINT_AT;
  const round =
    filter === "all"
      ? spaceByCategory(cards, wantSprint ? size - 1 : size)
      : cards.slice(0, wantSprint ? size - 1 : size);

  if (wantSprint) {
    const sprint = freshnessOrder(sprints, seen, rng)[0];
    round.splice(Math.min(SPRINT_AT, round.length), 0, sprint);
  }
  return round;
}

/** A full feed session: optional intro, a sampled round, then the summary. */
export function buildSession(
  filter: Filter,
  fewer: string[],
  withIntro: boolean,
  seen: string[] = [],
  rng: () => number = Math.random,
): Card[] {
  const lead: Card[] = withIntro && filter === "all" ? [INTRO] : [];
  return [...lead, ...buildRound(filter, fewer, seen, rng), SUMMARY];
}
