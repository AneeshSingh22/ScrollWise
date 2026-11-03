import { describe, expect, it } from "vitest";
import {
  SESSIONS,
  allFixedCards,
  buildFixedSession,
  fixedSessionCards,
  sessionById,
} from "@/lib/sessions";
import { isAnswerable } from "@/types/card";

/**
 * These sessions are hand-authored rather than generated, so the useful checks
 * are structural: the shapes the renderers rely on, and the mistakes that are
 * easy to make by hand (an answer index pointing at the wrong option, a
 * duplicated id, a repeated option string).
 */

describe("today's fixed sessions", () => {
  it("has four sessions", () => {
    expect(SESSIONS).toHaveLength(4);
  });

  it("gives every session a title, blurb, and minute count", () => {
    for (const s of SESSIONS) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.blurb.length).toBeGreaterThan(0);
      expect(s.minutes).toBeGreaterThan(0);
    }
  });

  it("has enough cards per session to fill about ten minutes", () => {
    for (const s of SESSIONS) {
      expect(s.cards.length).toBeGreaterThanOrEqual(12);
    }
  });

  it("uses globally unique card ids", () => {
    const ids = allFixedCards().map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses unique session ids", () => {
    const ids = SESSIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("marks every card as hardest difficulty", () => {
    for (const c of allFixedCards()) {
      expect(c.difficulty).toBe(3);
    }
  });

  it("never uses the UI-only intro or summary types as content", () => {
    for (const c of allFixedCards()) {
      expect(c.type).not.toBe("intro");
      expect(c.type).not.toBe("summary");
    }
  });

  it("gives each session a mix of card types, not just quizzes", () => {
    for (const s of SESSIONS) {
      const types = new Set(s.cards.map((c) => c.type));
      expect(types.size).toBeGreaterThanOrEqual(4);
    }
  });

  it("puts a math sprint in every session", () => {
    for (const s of SESSIONS) {
      expect(s.cards.some((c) => c.type === "sprint")).toBe(true);
    }
  });

  /**
   * Each of these sessions is deliberately themed (session 1 is all about
   * models, session 3 about systems), so SPEC section 7's "at most 2 of a
   * category in a row" rule for the mixed feed does not apply here — a themed
   * session is meant to stay on its topic. What still matters is that a
   * session never becomes one long unbroken block of the same thing, so the
   * check is on card *type* variety instead: never more than three cards of
   * the same type consecutively.
   */
  it("never runs more than three cards of one type back to back", () => {
    for (const s of SESSIONS) {
      let run = 1;
      for (let i = 1; i < s.cards.length; i++) {
        run = s.cards[i].type === s.cards[i - 1].type ? run + 1 : 1;
        expect(run, `${s.id} at index ${i} (${s.cards[i].type})`).toBeLessThanOrEqual(3);
      }
    }
  });

  it("breaks each session up with at least one non-question card", () => {
    for (const s of SESSIONS) {
      const breather = s.cards.filter((c) =>
        ["explainer", "fact", "tip", "trick", "sprint"].includes(c.type),
      );
      expect(breather.length, s.id).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("quiz cards", () => {
  const quizzes = allFixedCards().filter((c) => c.type === "quiz");

  it("has quiz cards to check", () => {
    expect(quizzes.length).toBeGreaterThan(0);
  });

  it("gives every quiz exactly four options", () => {
    for (const c of quizzes) {
      if (c.type !== "quiz") continue;
      expect(c.options, c.id).toHaveLength(4);
    }
  });

  it("points every answer index at a real option", () => {
    for (const c of quizzes) {
      if (c.type !== "quiz") continue;
      expect(c.answer, c.id).toBeGreaterThanOrEqual(0);
      expect(c.answer, c.id).toBeLessThan(c.options.length);
      expect(typeof c.options[c.answer], c.id).toBe("string");
    }
  });

  it("has no duplicate options within a quiz", () => {
    for (const c of quizzes) {
      if (c.type !== "quiz") continue;
      expect(new Set(c.options).size, c.id).toBe(c.options.length);
    }
  });

  it("has no blank option text", () => {
    for (const c of quizzes) {
      if (c.type !== "quiz") continue;
      for (const o of c.options) expect(o.trim().length, c.id).toBeGreaterThan(0);
    }
  });
});

describe("answerable cards explain themselves", () => {
  it("gives every quiz and true/false card a non-trivial why", () => {
    for (const c of allFixedCards()) {
      if (!isAnswerable(c)) continue;
      // The why is the teaching payload — a one-word "Correct." is a bug.
      expect(c.why.length, c.id).toBeGreaterThan(80);
    }
  });

  it("gives every true/false card a boolean answer", () => {
    for (const c of allFixedCards()) {
      if (c.type !== "tf") continue;
      expect(typeof c.answer, c.id).toBe("boolean");
    }
  });

  it("mixes true and false answers across the true/false cards", () => {
    const answers = allFixedCards()
      .filter((c) => c.type === "tf")
      .map((c) => (c.type === "tf" ? c.answer : null));
    expect(answers).toContain(true);
    expect(answers).toContain(false);
  });
});

describe("other card types have the fields their renderers read", () => {
  it("gives explainers three steps with a heading and text", () => {
    for (const c of allFixedCards()) {
      if (c.type !== "explainer") continue;
      expect(c.steps.length, c.id).toBeGreaterThanOrEqual(3);
      for (const st of c.steps) {
        expect(st.h.length, c.id).toBeGreaterThan(0);
        expect(st.p.length, c.id).toBeGreaterThan(0);
      }
    }
  });

  it("gives tips a concrete challenge", () => {
    for (const c of allFixedCards()) {
      if (c.type !== "tip") continue;
      expect(c.challenge.length, c.id).toBeGreaterThan(20);
    }
  });

  it("gives tricks both worked examples the renderer shows", () => {
    for (const c of allFixedCards()) {
      if (c.type !== "trick") continue;
      expect(c.example.length, c.id).toBeGreaterThan(0);
      expect(c.example2.length, c.id).toBeGreaterThan(0);
    }
  });

  it("gives facts a detail that pays off the title", () => {
    for (const c of allFixedCards()) {
      if (c.type !== "fact") continue;
      expect(c.detail.length, c.id).toBeGreaterThan(40);
    }
  });
});

describe("building a session for the feed", () => {
  it("appends a summary card after the content", () => {
    for (const s of SESSIONS) {
      const built = buildFixedSession(s.id);
      expect(built).toHaveLength(s.cards.length + 1);
      expect(built[built.length - 1].type).toBe("summary");
    }
  });

  it("keeps the authored card order", () => {
    const s = SESSIONS[0];
    const built = buildFixedSession(s.id);
    expect(built.slice(0, s.cards.length).map((c) => c.id)).toEqual(
      s.cards.map((c) => c.id),
    );
  });

  it("gives each session's summary card a distinct id", () => {
    const ids = SESSIONS.map((s) => {
      const built = buildFixedSession(s.id);
      return built[built.length - 1].id;
    });
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("falls back to the picker for an unknown id instead of throwing", () => {
    const built = buildFixedSession("nope");
    expect(built).toHaveLength(1);
    expect(built[0].type).toBe("intro");
  });

  it("looks a session up by id", () => {
    expect(sessionById("s1")?.title).toBe("Inside the model");
    expect(sessionById("nope")).toBeUndefined();
  });

  it("returns no cards for an unknown session", () => {
    expect(fixedSessionCards("nope")).toEqual([]);
  });
});
