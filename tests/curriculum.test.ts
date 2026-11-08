import { describe, expect, it } from "vitest";
import {
  ALL_LESSONS,
  buildLesson,
  COURSE_START,
  DAYS,
  dayByNumber,
  dayProgress,
  lessonById,
  LESSONS_PER_DAY,
  nextLesson,
  resumeLesson,
  todayDayNumber,
  TOPICS,
  unitByKey,
  unitOfLesson,
} from "@/lib/curriculum";
import { claudeCodeUrl, GITHUB_REPO } from "@/lib/constants";
import { DECK } from "@/lib/deck";
import { isAnswerable } from "@/types/card";

/**
 * The course is hand-written content, so these tests guard the mistakes that
 * are easy to make by hand and that the renderers would trip on.
 */

const at = (iso: string) => new Date(iso);

describe("course structure", () => {
  it("has 30 consecutive days starting at day 1", () => {
    expect(DAYS.map((d) => d.day)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });

  it("starts with transformers, GPUs, then semiconductors", () => {
    expect(DAYS.slice(0, 3).map((d) => d.slug)).toEqual(["transformers", "gpus", "semiconductors"]);
  });

  it("gives every day four lessons", () => {
    for (const d of DAYS) expect(d.lessons, d.slug).toHaveLength(LESSONS_PER_DAY);
  });

  it("has unique day slugs and topics", () => {
    expect(new Set(DAYS.map((d) => d.slug)).size).toBe(DAYS.length);
    expect(new Set(DAYS.map((d) => d.topic)).size).toBe(DAYS.length);
  });

  it("gives every lesson enough cards and a mix of card types", () => {
    for (const l of ALL_LESSONS) {
      expect(l.cards.length, l.id).toBeGreaterThanOrEqual(5);
      expect(new Set(l.cards.map((c) => c.type)).size, l.id).toBeGreaterThanOrEqual(3);
    }
  });

  it("makes every lesson interactive, with at least two questions", () => {
    for (const l of ALL_LESSONS) {
      expect(l.cards.filter(isAnswerable).length, l.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("assigns unique, stable card ids", () => {
    const ids = ALL_LESSONS.flatMap((l) => l.cards.map((c) => c.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe("d01-l1-c1");
  });

  it("never collides with feed card ids or review clones", () => {
    const feed = new Set(DECK.map((c) => c.id));
    for (const l of ALL_LESSONS) {
      for (const c of l.cards) {
        expect(feed.has(c.id)).toBe(false);
        expect(c.id.endsWith("-r")).toBe(false);
      }
    }
  });

  it("uses no UI-only card types as content", () => {
    for (const l of ALL_LESSONS) {
      for (const c of l.cards) expect(["intro", "summary", "sprint"]).not.toContain(c.type);
    }
  });
});

describe("course card content", () => {
  const cards = ALL_LESSONS.flatMap((l) => l.cards);

  it("gives every quiz four distinct options and an in-range answer", () => {
    for (const c of cards) {
      if (c.type !== "quiz") continue;
      expect(c.options, c.id).toHaveLength(4);
      expect(new Set(c.options).size, c.id).toBe(4);
      expect(c.answer, c.id).toBeGreaterThanOrEqual(0);
      expect(c.answer, c.id).toBeLessThan(4);
    }
  });

  it("explains every answer properly", () => {
    for (const c of cards) {
      if (!isAnswerable(c)) continue;
      expect(c.why.length, c.id).toBeGreaterThan(80);
    }
  });

  it("gives every explainer at least three filled steps", () => {
    for (const c of cards) {
      if (c.type !== "explainer") continue;
      expect(c.steps.length, c.id).toBeGreaterThanOrEqual(3);
      for (const s of c.steps) {
        expect(s.h.trim(), c.id).not.toBe("");
        expect(s.p.trim(), c.id).not.toBe("");
      }
    }
  });

  it("gives facts and tips their full fields", () => {
    for (const c of cards) {
      if (c.type === "fact") expect(c.detail.length, c.id).toBeGreaterThan(40);
      if (c.type === "tip") expect(c.challenge.length, c.id).toBeGreaterThan(20);
    }
  });

  it("spreads correct quiz answers across all four positions", () => {
    const counts = [0, 0, 0, 0];
    for (const c of cards) if (c.type === "quiz") counts[c.answer]++;
    const total = counts.reduce((a, b) => a + b, 0);
    // Unshuffled, ~90% sat in slot B. No slot should hold over 40% now.
    for (const n of counts) expect(n / total).toBeLessThan(0.4);
  });

  it("mixes true and false answers", () => {
    const tf = cards.filter((c) => c.type === "tf");
    const t = tf.filter((c) => c.type === "tf" && c.answer).length;
    expect(t / tf.length).toBeGreaterThan(0.35);
    expect(t / tf.length).toBeLessThan(0.65);
  });
});

describe("today's course day", () => {
  it("is day 1 on the start date", () => {
    expect(COURSE_START).toBe("2026-11-03");
    expect(todayDayNumber(at("2026-11-03T08:00:00"))).toBe(1);
  });

  it("counts in local days, not hours since a UTC midnight", () => {
    expect(todayDayNumber(at("2026-11-03T23:59:00"))).toBe(1);
    expect(todayDayNumber(at("2026-11-04T00:01:00"))).toBe(2);
  });

  it("is day 1 before the course starts", () => {
    expect(todayDayNumber(at("2026-10-01T12:00:00"))).toBe(1);
  });

  it("stays on the last day after the course ends", () => {
    expect(todayDayNumber(at("2027-03-01T12:00:00"))).toBe(30);
  });

  it("reaches day 30 on the 30th day", () => {
    expect(todayDayNumber(at("2026-12-02T12:00:00"))).toBe(30);
  });
});

describe("lessons and progress", () => {
  it("builds a lesson closed by its own finish card", () => {
    const built = buildLesson("d01-l1");
    const lesson = lessonById("d01-l1")!;
    expect(built).toHaveLength(lesson.cards.length + 2);
    expect(built[0]).toMatchObject({ type: "terms", id: "terms-d01-l1" });
    expect(built[built.length - 1]).toMatchObject({ type: "summary", id: "summary-d01-l1" });
  });

  it("returns nothing for an unknown lesson", () => {
    expect(buildLesson("nope")).toEqual([]);
  });

  it("moves to the next lesson, then across to the next day", () => {
    expect(nextLesson("d01-l1")?.id).toBe("d01-l2");
    expect(nextLesson("d01-l4")?.id).toBe("d02-l1");
    expect(nextLesson("d30-l4")).toBeUndefined();
  });

  it("counts a day's finished lessons, ignoring other days", () => {
    const d1 = dayByNumber(1)!;
    expect(dayProgress(d1, [])).toBe(0);
    expect(dayProgress(d1, ["d01-l1", "d01-l3", "d02-l1"])).toBe(2);
  });

  it("resumes at the first unfinished lesson", () => {
    const d1 = dayByNumber(1)!;
    expect(resumeLesson(d1, ["d01-l1"]).id).toBe("d01-l2");
    expect(resumeLesson(d1, ["d01-l1", "d01-l2", "d01-l3", "d01-l4"]).id).toBe("d01-l1");
  });
});

describe("custom topics", () => {
  it("loads the quantum computing topic under Your topics", () => {
    const q = TOPICS.find((t) => t.slug === "quantum-computing");
    expect(q?.kind).toBe("topic");
    expect(q?.lessons).toHaveLength(4);
    expect(q?.lessons[0].cards[0].id).toBe("t-quantum-computing-l1-c1");
  });

  it("keeps topic lessons out of the 30-day course", () => {
    expect(DAYS.every((d) => d.kind === "day")).toBe(true);
    expect(DAYS.flatMap((d) => d.lessons).some((l) => l.id.startsWith("t-"))).toBe(false);
  });

  it("ends a topic after its last lesson instead of jumping to a course day", () => {
    expect(nextLesson("t-quantum-computing-l1")?.id).toBe("t-quantum-computing-l2");
    expect(nextLesson("t-quantum-computing-l4")).toBeUndefined();
  });

  it("finds a topic lesson's unit", () => {
    expect(unitOfLesson("t-quantum-computing-l2")?.key).toBe("topic-quantum-computing");
    expect(unitByKey("day-1")?.topic).toBe("Transformers");
  });

  it("builds a topic lesson the same way as a course lesson", () => {
    const built = buildLesson("t-quantum-computing-l1");
    expect(built[built.length - 1].type).toBe("summary");
  });
});

describe("Claude Code hand-off link", () => {
  it("pre-fills the prompt and selects the repo", () => {
    const url = new URL(claudeCodeUrl("/new-topic Roman Empire & Rome"));
    expect(url.origin + url.pathname).toBe("https://claude.ai/code");
    expect(url.searchParams.get("prompt")).toBe("/new-topic Roman Empire & Rome");
    expect(url.searchParams.get("repositories")).toBe(GITHUB_REPO);
  });

  it("opens with just the repo when there's no prompt", () => {
    const url = new URL(claudeCodeUrl("  "));
    expect(url.searchParams.has("prompt")).toBe(false);
    expect(url.searchParams.get("repositories")).toBe(GITHUB_REPO);
  });
});
