import seed from "@/data/seed-cards.json";
import type { Card, IntroCard, SummaryCard } from "@/types/card";
import type { Filter } from "./constants";

/**
 * Phase 0 session building: filter the seed deck, honor "fewer", bookend with
 * the intro and summary cards. Phase 6 replaces this with /api/session
 * (weighted sampling, due reviews, category spacing — SPEC section 7).
 */

export const DECK = seed as Card[];

export const INTRO: IntroCard = { id: "intro", cat: "intro", type: "intro" };
export const SUMMARY: SummaryCard = { id: "summary", cat: "intro", type: "summary" };

export function byId(id: string): Card | undefined {
  const base = baseId(id);
  if (base === "intro") return INTRO;
  if (base === "summary") return SUMMARY;
  return DECK.find((c) => c.id === base);
}

/** Review clones get a "-r" suffix; this recovers the original card id. */
export function baseId(id: string): string {
  return id.replace(/-r$/, "");
}

export function buildRound(filter: Filter, fewer: string[]): Card[] {
  let cards = DECK.filter((c) => filter === "all" || c.cat === filter);

  if (filter === "all" && fewer.length) {
    // Keep every other card from muted topics.
    const seenCount: Record<string, number> = {};
    cards = cards.filter((c) => {
      if (!fewer.includes(c.cat)) return true;
      seenCount[c.cat] = (seenCount[c.cat] || 0) + 1;
      return seenCount[c.cat] % 2 === 1;
    });
  }

  return cards;
}

/** A full session: optional intro, the round, then the summary. */
export function buildSession(
  filter: Filter,
  fewer: string[],
  withIntro: boolean,
): Card[] {
  const lead: Card[] = withIntro && filter === "all" ? [INTRO] : [];
  return [...lead, ...buildRound(filter, fewer), SUMMARY];
}
