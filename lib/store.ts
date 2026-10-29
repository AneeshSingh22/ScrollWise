/**
 * Local persistence. The prototype's `store` + streak rollover, kept as-is in
 * behavior. Phase 1 moves this to Supabase; the shape is deliberately the same
 * as the `profiles` row in SPEC section 10 so that swap is mechanical.
 */

const KEY = "scrollwise";

export type Persisted = {
  xp: number;
  streak: number;
  /** Local-time date key ("en-CA" → YYYY-MM-DD) of the last active day. */
  lastDay: string;
  saved: string[];
  liked: string[];
  fewer: string[];
};

export const EMPTY: Persisted = {
  xp: 0,
  streak: 1,
  lastDay: "",
  saved: [],
  liked: [],
  fewer: [],
};

/** Local-time date key. Streaks must roll over at the user's midnight, not UTC. */
export function dayKey(d: Date = new Date()): string {
  return d.toLocaleDateString("en-CA");
}

export function read(): Persisted {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return {
      ...EMPTY,
      ...parsed,
      // Guard against hand-edited or partially-written storage.
      saved: Array.isArray(parsed.saved) ? parsed.saved : [],
      liked: Array.isArray(parsed.liked) ? parsed.liked : [],
      fewer: Array.isArray(parsed.fewer) ? parsed.fewer : [],
    };
  } catch {
    return EMPTY;
  }
}

export function write(v: Persisted): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    // Private mode or blocked storage — the session still works, just unsaved.
  }
}

/**
 * Applies the day rollover: consecutive day extends the streak, a gap resets
 * it to 1. Returns the state unchanged if we have already counted today.
 */
export function applyStreak(s: Persisted, now: Date = new Date()): Persisted {
  const today = dayKey(now);
  if (s.lastDay === today) return s;
  const yesterday = dayKey(new Date(now.getTime() - 864e5));
  return {
    ...s,
    streak: s.lastDay === yesterday ? s.streak + 1 : 1,
    lastDay: today,
  };
}
