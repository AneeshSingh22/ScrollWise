import { describe, expect, it } from "vitest";
import { baseId, buildRound, buildSession, byId, DECK } from "@/lib/deck";
import { CATS, KIND } from "@/lib/constants";
import { isAnswerable, type Card } from "@/types/card";

describe("seed deck", () => {
  it("has cards", () => {
    expect(DECK.length).toBeGreaterThan(0);
  });

  it("has unique ids", () => {
    const ids = DECK.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has no id that collides with a review clone", () => {
    // A card literally named "foo-r" would be mistaken for a review of "foo".
    for (const c of DECK) expect(c.id.endsWith("-r")).toBe(false);
  });

  it("uses only known categories and types", () => {
    for (const c of DECK) {
      expect(Object.keys(CATS)).toContain(c.cat);
      expect(Object.keys(KIND)).toContain(c.type);
    }
  });

  it("contains no intro or summary cards — those are UI-only", () => {
    for (const c of DECK) {
      expect(c.type).not.toBe("intro");
      expect(c.type).not.toBe("summary");
    }
  });

  it("every quiz has 4 distinct options and an in-range answer", () => {
    const quizzes = DECK.filter((c) => c.type === "quiz");
    expect(quizzes.length).toBeGreaterThan(0);
    for (const q of quizzes) {
      if (q.type !== "quiz") continue;
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(q.options.length);
      // No option repeats the question text back at the reader.
      for (const o of q.options) expect(q.q).not.toBe(o);
    }
  });

  it("every answerable card explains itself", () => {
    for (const c of DECK) {
      if (!isAnswerable(c)) continue;
      expect(c.why.trim().length).toBeGreaterThan(0);
    }
  });

  it("true/false answers are booleans", () => {
    for (const c of DECK) {
      if (c.type !== "tf") continue;
      expect(typeof c.answer).toBe("boolean");
    }
  });

  it("every explainer has at least one step with text", () => {
    for (const c of DECK) {
      if (c.type !== "explainer") continue;
      expect(c.steps.length).toBeGreaterThanOrEqual(1);
      for (const s of c.steps) {
        expect(s.h.trim().length).toBeGreaterThan(0);
        expect(s.p.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("every tip has a concrete challenge", () => {
    for (const c of DECK) {
      if (c.type !== "tip") continue;
      expect(c.challenge.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("baseId", () => {
  it("strips the review suffix", () => {
    expect(baseId("ai-gpt-r")).toBe("ai-gpt");
  });

  it("leaves a normal id alone", () => {
    expect(baseId("ai-gpt")).toBe("ai-gpt");
  });
});

describe("byId", () => {
  it("finds a seed card", () => {
    expect(byId("ai-gpt")?.type).toBe("quiz");
  });

  it("resolves a review clone to its original", () => {
    expect(byId("ai-gpt-r")?.id).toBe("ai-gpt");
  });

  it("resolves the UI-only cards", () => {
    expect(byId("intro")?.type).toBe("intro");
    expect(byId("summary")?.type).toBe("summary");
  });

  it("returns undefined for an unknown id", () => {
    expect(byId("nope")).toBeUndefined();
  });
});

describe("buildRound", () => {
  it("returns the whole deck with no filter and no muted topics", () => {
    expect(buildRound("all", [])).toHaveLength(DECK.length);
  });

  it("filters to a single category", () => {
    const ai = buildRound("ai", []);
    expect(ai.length).toBeGreaterThan(0);
    for (const c of ai) expect(c.cat).toBe("ai");
  });

  it("halves a muted topic but keeps the others whole", () => {
    const all = buildRound("all", []);
    const muted = buildRound("all", ["ai"]);

    const aiAll = all.filter((c) => c.cat === "ai").length;
    const aiMuted = muted.filter((c) => c.cat === "ai").length;
    expect(aiMuted).toBe(Math.ceil(aiAll / 2));

    const techAll = all.filter((c) => c.cat === "tech").length;
    expect(muted.filter((c) => c.cat === "tech")).toHaveLength(techAll);
  });

  it("ignores muting when a category is explicitly selected", () => {
    // Picking the AI chip means you want AI, even if you muted it before.
    const ai = buildRound("ai", ["ai"]);
    expect(ai).toHaveLength(DECK.filter((c) => c.cat === "ai").length);
  });
});

describe("buildSession", () => {
  const last = (cards: Card[]) => cards[cards.length - 1];

  it("ends with the summary card", () => {
    expect(last(buildSession("all", [], true)).type).toBe("summary");
    expect(last(buildSession("ai", [], false)).type).toBe("summary");
  });

  it("opens with the intro only on the first unfiltered session", () => {
    expect(buildSession("all", [], true)[0].type).toBe("intro");
    expect(buildSession("all", [], false)[0].type).not.toBe("intro");
    // A filtered first session skips the intro too.
    expect(buildSession("ai", [], true)[0].type).not.toBe("intro");
  });

  it("holds every round card between the bookends", () => {
    const session = buildSession("all", [], true);
    expect(session).toHaveLength(DECK.length + 2);
  });

  it("never produces an empty round for any chip", () => {
    for (const f of ["all", "ai", "tech", "life", "world", "math"] as const) {
      expect(buildRound(f, []).length).toBeGreaterThan(0);
    }
  });
});
