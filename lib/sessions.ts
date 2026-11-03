import today from "@/data/sessions-today.json";
import type { Card, IntroCard, SummaryCard } from "@/types/card";

/**
 * Hand-authored fixed sessions for a single day's use on the phone.
 *
 * This is deliberately NOT the Phase 6 session builder (SPEC section 7) — no
 * weighting, no sampling, no spaced repetition. It is a curated set of hard
 * sessions with a fixed card order, so a session is the same every time it is
 * opened and can be worked through during a real break from work.
 *
 * lib/deck.ts (the seed deck and buildSession) is untouched and still backs
 * the topic-chip feed; this module only adds the "today's sessions" path.
 */

export type TodaySession = {
  id: string;
  title: string;
  blurb: string;
  minutes: number;
  cards: Card[];
};

type TodayFile = { date: string; sessions: TodaySession[] };

const file = today as unknown as TodayFile;

export const SESSION_DATE: string = file.date;
export const SESSIONS: TodaySession[] = file.sessions;

export function sessionById(id: string): TodaySession | undefined {
  return SESSIONS.find((s) => s.id === id);
}

/** The menu card that leads a session-mode feed. */
export type PickerCard = IntroCard & { picker: true };

export const PICKER: PickerCard = {
  id: "picker",
  cat: "intro",
  type: "intro",
  picker: true,
};

/** A fixed session's cards, bookended by the picker and the summary. */
export function buildFixedSession(id: string): Card[] {
  const s = sessionById(id);
  if (!s) return [PICKER as Card];
  const summary: SummaryCard = { id: `summary-${id}`, cat: "intro", type: "summary" };
  return [...s.cards, summary];
}

/** Cards only, for counting and for looking a card up by id. */
export function fixedSessionCards(id: string): Card[] {
  return sessionById(id)?.cards ?? [];
}

export function allFixedCards(): Card[] {
  return SESSIONS.flatMap((s) => s.cards);
}
