/**
 * Mental-math problems for the 45-second sprint.
 *
 * Phase 0 ports the prototype's five generators as-is. Phase 2 adds squares,
 * doubling chains, and difficulty scaling from sprint history (SPEC 6.4).
 */

export type Problem = {
  /** Displayed expression, e.g. "43 × 11". */
  expr: string;
  answer: number;
};

export function rnd(a: number, b: number, rng: () => number = Math.random): number {
  return a + Math.floor(rng() * (b - a + 1));
}

export type ProblemKind = "add" | "times11" | "percent" | "times" | "subtract";

export const PROBLEM_KINDS: ProblemKind[] = [
  "add",
  "times11",
  "percent",
  "times",
  "subtract",
];

export function makeProblemOf(kind: ProblemKind, rng: () => number = Math.random): Problem {
  switch (kind) {
    case "add": {
      const a = rnd(18, 89, rng);
      const b = rnd(14, 79, rng);
      return { expr: `${a} + ${b}`, answer: a + b };
    }
    case "times11": {
      const a = rnd(12, 89, rng);
      return { expr: `${a} × 11`, answer: a * 11 };
    }
    case "percent": {
      const pcts = [10, 15, 20, 25, 50];
      const p = pcts[rnd(0, pcts.length - 1, rng)];
      // q is a multiple of 20, so p% of q is always a whole number.
      const q = rnd(2, 20, rng) * 20;
      return { expr: `${p}% of ${q}`, answer: (p * q) / 100 };
    }
    case "times": {
      const a = rnd(12, 25, rng);
      const b = rnd(3, 9, rng);
      return { expr: `${a} × ${b}`, answer: a * b };
    }
    case "subtract": {
      const a = rnd(52, 99, rng);
      // Keeps the result positive and at least 11.
      const b = rnd(13, a - 11, rng);
      return { expr: `${a} − ${b}`, answer: a - b };
    }
  }
}

export function makeProblem(rng: () => number = Math.random): Problem {
  return makeProblemOf(PROBLEM_KINDS[rnd(0, PROBLEM_KINDS.length - 1, rng)], rng);
}
