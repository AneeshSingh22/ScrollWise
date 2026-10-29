import { describe, expect, it } from "vitest";
import {
  makeProblem,
  makeProblemOf,
  PROBLEM_KINDS,
  rnd,
} from "@/lib/procedural/math";

/** Deterministic RNG so a failure is reproducible. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    // xorshift32
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0x100000000;
  };
}

/** Recomputes the answer from the rendered expression. */
function evaluate(expr: string): number {
  const pct = expr.match(/^(\d+)% of (\d+)$/);
  if (pct) return (Number(pct[1]) * Number(pct[2])) / 100;

  const bin = expr.match(/^(\d+) ([+×−]) (\d+)$/);
  if (!bin) throw new Error(`unparsed expression: ${expr}`);
  const [a, op, b] = [Number(bin[1]), bin[2], Number(bin[3])];
  if (op === "+") return a + b;
  if (op === "×") return a * b;
  return a - b;
}

describe("rnd", () => {
  it("stays within the inclusive range", () => {
    const rng = seeded(1);
    for (let i = 0; i < 2000; i++) {
      const v = rnd(5, 9, rng);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(9);
    }
  });

  it("can hit both endpoints", () => {
    const rng = seeded(7);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) seen.add(rnd(0, 3, rng));
    expect(seen).toEqual(new Set([0, 1, 2, 3]));
  });
});

describe("makeProblem", () => {
  it("every generated answer matches its expression", () => {
    const rng = seeded(42);
    for (let i = 0; i < 5000; i++) {
      const p = makeProblem(rng);
      expect(evaluate(p.expr)).toBe(p.answer);
    }
  });

  it("answers are always non-negative whole numbers", () => {
    const rng = seeded(99);
    for (let i = 0; i < 5000; i++) {
      const p = makeProblem(rng);
      expect(Number.isInteger(p.answer)).toBe(true);
      expect(p.answer).toBeGreaterThanOrEqual(0);
    }
  });

  it("produces every kind over enough draws", () => {
    const rng = seeded(3);
    const shapes = new Set<string>();
    for (let i = 0; i < 3000; i++) {
      const e = makeProblem(rng).expr;
      if (e.includes("% of")) shapes.add("percent");
      else if (e.includes("+")) shapes.add("add");
      else if (e.includes("−")) shapes.add("subtract");
      else if (e.endsWith("× 11")) shapes.add("times11");
      else shapes.add("times");
    }
    expect(shapes.size).toBe(5);
  });
});

describe("makeProblemOf", () => {
  it.each(PROBLEM_KINDS)("%s is always self-consistent", (kind) => {
    const rng = seeded(kind.length * 13 + 1);
    for (let i = 0; i < 2000; i++) {
      const p = makeProblemOf(kind, rng);
      expect(evaluate(p.expr)).toBe(p.answer);
    }
  });

  it("subtraction never goes negative", () => {
    const rng = seeded(5);
    for (let i = 0; i < 3000; i++) {
      const p = makeProblemOf("subtract", rng);
      expect(p.answer).toBeGreaterThan(0);
    }
  });

  it("percentages are always whole", () => {
    const rng = seeded(11);
    for (let i = 0; i < 3000; i++) {
      const p = makeProblemOf("percent", rng);
      expect(Number.isInteger(p.answer)).toBe(true);
    }
  });

  it("×11 matches the trick the trick card teaches", () => {
    const rng = seeded(17);
    for (let i = 0; i < 1000; i++) {
      const p = makeProblemOf("times11", rng);
      const a = Number(p.expr.split(" ")[0]);
      expect(p.answer).toBe(a * 11);
    }
  });
});
