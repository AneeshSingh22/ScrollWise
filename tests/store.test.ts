import { describe, expect, it } from "vitest";
import { applyStreak, dayKey, EMPTY, type Persisted } from "@/lib/store";
import { levelFor, XP_PER_LEVEL } from "@/lib/constants";

function at(iso: string): Date {
  return new Date(iso);
}

function stateOn(lastDay: string, streak: number): Persisted {
  return { ...EMPTY, lastDay, streak };
}

describe("dayKey", () => {
  it("uses local time, not UTC", () => {
    // 23:30 local on the 5th is still the 5th, whatever the UTC date is.
    const d = at("2026-03-05T23:30:00");
    expect(dayKey(d)).toBe("2026-03-05");
  });

  it("formats as YYYY-MM-DD", () => {
    expect(dayKey(at("2026-01-09T10:00:00"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dayKey(at("2026-01-09T10:00:00"))).toBe("2026-01-09");
  });
});

describe("applyStreak", () => {
  it("extends the streak on a consecutive day", () => {
    const now = at("2026-03-05T09:00:00");
    const s = applyStreak(stateOn("2026-03-04", 4), now);
    expect(s.streak).toBe(5);
    expect(s.lastDay).toBe("2026-03-05");
  });

  it("resets to 1 after a gap", () => {
    const now = at("2026-03-05T09:00:00");
    const s = applyStreak(stateOn("2026-03-02", 9), now);
    expect(s.streak).toBe(1);
    expect(s.lastDay).toBe("2026-03-05");
  });

  it("is a no-op when already counted today", () => {
    const now = at("2026-03-05T22:00:00");
    const before = stateOn("2026-03-05", 7);
    const after = applyStreak(before, now);
    expect(after).toBe(before);
    expect(after.streak).toBe(7);
  });

  it("starts a fresh profile at 1", () => {
    const s = applyStreak(EMPTY, at("2026-03-05T09:00:00"));
    expect(s.streak).toBe(1);
    expect(s.lastDay).toBe("2026-03-05");
  });

  it("rolls over a month boundary", () => {
    const s = applyStreak(stateOn("2026-02-28", 3), at("2026-03-01T08:00:00"));
    expect(s.streak).toBe(4);
  });

  it("rolls over a leap day", () => {
    // 2028 is a leap year, so Feb 29 follows Feb 28.
    const s = applyStreak(stateOn("2028-02-28", 2), at("2028-02-29T08:00:00"));
    expect(s.streak).toBe(3);
  });

  it("rolls over a year boundary", () => {
    const s = applyStreak(stateOn("2026-12-31", 11), at("2027-01-01T00:30:00"));
    expect(s.streak).toBe(12);
  });

  it("counts a late-night then next-morning visit as two days", () => {
    let s = applyStreak(stateOn("2026-03-03", 1), at("2026-03-04T23:50:00"));
    expect(s.streak).toBe(2);
    s = applyStreak(s, at("2026-03-05T00:10:00"));
    expect(s.streak).toBe(3);
  });

  it("does not mutate the input", () => {
    const before = stateOn("2026-03-04", 4);
    const copy = { ...before };
    applyStreak(before, at("2026-03-05T09:00:00"));
    expect(before).toEqual(copy);
  });
});

describe("levelFor", () => {
  it("starts at level 1", () => {
    expect(levelFor(0)).toBe(1);
    expect(levelFor(XP_PER_LEVEL - 1)).toBe(1);
  });

  it("levels up every 250 XP", () => {
    expect(levelFor(XP_PER_LEVEL)).toBe(2);
    expect(levelFor(XP_PER_LEVEL * 2)).toBe(3);
    expect(levelFor(XP_PER_LEVEL * 10 + 10)).toBe(11);
  });
});
