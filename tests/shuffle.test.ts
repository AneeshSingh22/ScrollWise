import { describe, expect, it } from "vitest";
import { hashString, seededRng, shuffleQuiz } from "@/lib/shuffle";
import type { QuizCard, TfCard } from "@/types/card";

const quiz = (id: string): QuizCard => ({
  id,
  cat: "ai",
  type: "quiz",
  q: "Which?",
  options: ["A", "B", "C", "D"],
  answer: 1,
  why: "B is right.",
});

describe("shuffleQuiz", () => {
  it("keeps the same correct option text after shuffling", () => {
    for (let i = 0; i < 200; i++) {
      const s = shuffleQuiz(quiz(`q${i}`));
      expect(s.options[s.answer]).toBe("B");
      expect([...s.options].sort()).toEqual(["A", "B", "C", "D"]);
    }
  });

  it("is deterministic for a given card id", () => {
    expect(shuffleQuiz(quiz("same"))).toEqual(shuffleQuiz(quiz("same")));
  });

  it("spreads the answer across all four slots", () => {
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 400; i++) counts[shuffleQuiz(quiz(`q${i}`)).answer]++;
    for (const n of counts) expect(n).toBeGreaterThan(60);
  });

  it("does not mutate the input", () => {
    const q = quiz("x");
    shuffleQuiz(q);
    expect(q.options).toEqual(["A", "B", "C", "D"]);
    expect(q.answer).toBe(1);
  });

  it("passes non-quiz cards through untouched", () => {
    const tf: TfCard = { id: "t", cat: "ai", type: "tf", statement: "s", answer: true, why: "w" };
    expect(shuffleQuiz(tf)).toBe(tf);
  });
});

describe("seededRng and hashString", () => {
  it("produces the same sequence for the same seed", () => {
    const a = seededRng(7);
    const b = seededRng(7);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });

  it("stays within [0, 1)", () => {
    const r = seededRng(123);
    for (let i = 0; i < 1000; i++) {
      const x = r();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it("hashes strings stably and differently", () => {
    expect(hashString("abc")).toBe(hashString("abc"));
    expect(hashString("abc")).not.toBe(hashString("abd"));
  });
});
