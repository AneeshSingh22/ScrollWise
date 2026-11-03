import { describe, expect, it } from "vitest";
import {
  baseId,
  buildRound,
  buildSession,
  byId,
  DECK,
  freshnessOrder,
  ROUND_SIZE,
  SPRINT_AT,
  spaceByCategory,
} from "@/lib/deck";
import { seededRng } from "@/lib/shuffle";
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

/** A fixed RNG so sampling tests are reproducible. */
const rng = () => seededRng(42);

describe("buildRound", () => {
  it("samples a round of ROUND_SIZE cards, not the whole deck", () => {
    expect(DECK.length).toBeGreaterThan(ROUND_SIZE * 5);
    expect(buildRound("all", [], [], rng())).toHaveLength(ROUND_SIZE);
  });

  it("never repeats a card within a round", () => {
    const ids = buildRound("all", [], [], rng()).map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("puts exactly one math sprint at SPRINT_AT on the For you feed", () => {
    const round = buildRound("all", [], [], rng());
    expect(round.filter((c) => c.type === "sprint")).toHaveLength(1);
    expect(round[SPRINT_AT].type).toBe("sprint");
  });

  it("filters to a single category", () => {
    const ai = buildRound("ai", [], [], rng());
    expect(ai.length).toBeGreaterThan(0);
    for (const c of ai) expect(c.cat).toBe("ai");
  });

  it("never runs one category three times in a row on For you", () => {
    for (let seed = 0; seed < 20; seed++) {
      const round = buildRound("all", [], [], seededRng(seed)).filter((c) => c.type !== "sprint");
      for (let i = 2; i < round.length; i++) {
        const run = round[i].cat === round[i - 1].cat && round[i].cat === round[i - 2].cat;
        expect(run, `seed ${seed} at ${i}`).toBe(false);
      }
    }
  });

  it("prefers cards the user hasn't seen", () => {
    const first = buildRound("all", [], [], rng());
    const seen = first.map((c) => c.id);
    const second = buildRound("all", [], seen, rng());
    const repeats = second.filter((c) => c.type !== "sprint" && seen.includes(c.id));
    expect(repeats).toHaveLength(0);
  });

  it("serves the least recently seen cards once everything has been seen", () => {
    const pool = DECK.filter((c) => c.cat === "math" && c.type !== "sprint");
    const seen = pool.map((c) => c.id); // oldest first
    const ordered = freshnessOrder(pool, seen, rng());
    expect(ordered.map((c) => c.id)).toEqual(seen);
  });

  it("thins a muted topic on For you", () => {
    let muted = 0;
    let plain = 0;
    for (let seed = 0; seed < 30; seed++) {
      plain += buildRound("all", [], [], seededRng(seed)).filter((c) => c.cat === "world").length;
      muted += buildRound("all", ["world"], [], seededRng(seed)).filter((c) => c.cat === "world").length;
    }
    expect(muted).toBeLessThan(plain);
  });

  it("ignores muting when a category is explicitly selected", () => {
    // Picking the World chip means you want World, even if you muted it before.
    const world = buildRound("world", ["world"], [], rng());
    expect(world.length).toBeGreaterThan(0);
    for (const c of world) expect(c.cat).toBe("world");
  });

  it("never produces an empty round for any chip", () => {
    for (const f of ["all", "ai", "tech", "life", "world", "math"] as const) {
      expect(buildRound(f, [], [], rng()).length).toBeGreaterThan(0);
    }
  });
});

describe("spaceByCategory", () => {
  const card = (id: string, cat: Card["cat"]) => ({ id, cat, type: "fact", title: id, detail: "" }) as Card;

  it("breaks up a run when another category is available", () => {
    const out = spaceByCategory(
      [card("a1", "ai"), card("a2", "ai"), card("a3", "ai"), card("w1", "world")],
      4,
    );
    expect(out.map((c) => c.id)).toEqual(["a1", "a2", "w1", "a3"]);
  });

  it("still fills the round when only one category is left", () => {
    const out = spaceByCategory([card("a1", "ai"), card("a2", "ai"), card("a3", "ai")], 3);
    expect(out).toHaveLength(3);
  });
});

describe("buildSession", () => {
  const last = (cards: Card[]) => cards[cards.length - 1];

  it("ends with the summary card", () => {
    expect(last(buildSession("all", [], true, [], rng())).type).toBe("summary");
    expect(last(buildSession("ai", [], false, [], rng())).type).toBe("summary");
  });

  it("opens with the intro only on an unfiltered session that asks for it", () => {
    expect(buildSession("all", [], true, [], rng())[0].type).toBe("intro");
    expect(buildSession("all", [], false, [], rng())[0].type).not.toBe("intro");
    expect(buildSession("ai", [], true, [], rng())[0].type).not.toBe("intro");
  });

  it("holds one round between the bookends", () => {
    expect(buildSession("all", [], true, [], rng())).toHaveLength(ROUND_SIZE + 2);
  });
});

describe("byId across the feed and the course", () => {
  it("finds a course card", () => {
    expect(byId("d01-l1-c1")?.type).toBe("explainer");
  });
});
