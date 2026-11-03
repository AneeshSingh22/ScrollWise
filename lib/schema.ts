import { z } from "zod";

/**
 * Validation for authored and generated content (CLAUDE.md: every generated
 * card must pass Zod validation and the rule checks before it goes live).
 *
 * - Zod schemas check shape: right fields, right types, sane counts.
 * - ruleProblems() checks the SPEC section 5 limits and the house rules that a
 *   schema can't express (word counts, distinct options, allowed markup).
 *
 * scripts/build-indexes.ts runs both over every course day and custom topic
 * before each build and test run, and refuses to continue if anything fails.
 */

export const CATEGORY = z.enum(["ai", "tech", "life", "world", "math"]);

const text = z.string().trim().min(1);

const base = {
  cat: CATEGORY.optional(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  tags: z.array(z.string()).optional(),
  source: z.string().optional(),
  source_url: z.string().url().startsWith("https://").optional(),
};

export const QuizSchema = z.object({
  ...base,
  type: z.literal("quiz"),
  q: text,
  options: z.array(text).length(4),
  answer: z.number().int().min(0).max(3),
  why: text,
});

export const TfSchema = z.object({
  ...base,
  type: z.literal("tf"),
  statement: text,
  answer: z.boolean(),
  why: text,
});

export const FactSchema = z.object({ ...base, type: z.literal("fact"), title: text, detail: text });

export const ExplainerSchema = z.object({
  ...base,
  type: z.literal("explainer"),
  title: text,
  steps: z.array(z.object({ h: text, p: text })).min(2).max(5),
  aside: z.string().optional(),
});

export const TipSchema = z.object({
  ...base,
  type: z.literal("tip"),
  title: text,
  body: text,
  challenge: text,
});

export const TrickSchema = z.object({
  ...base,
  type: z.literal("trick"),
  title: text,
  body: text,
  example: text,
  example2: text,
});

/** Card types a lesson may contain. Sprints, intro and summary are UI-made. */
export const LessonCardSchema = z.discriminatedUnion("type", [
  QuizSchema,
  TfSchema,
  FactSchema,
  ExplainerSchema,
  TipSchema,
  TrickSchema,
]);

export const LessonSchema = z.object({
  title: text,
  cards: z.array(LessonCardSchema).min(4).max(10),
});

export const DaySchema = z.object({
  day: z.number().int().min(1),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  topic: text,
  cat: CATEGORY,
  blurb: text,
  lessons: z.array(LessonSchema).length(4),
});

/** A custom topic made with /new-topic. Same as a day, minus the day number. */
export const TopicSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug must be lowercase-with-dashes"),
  topic: text,
  cat: CATEGORY,
  blurb: text,
  created: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "created must be YYYY-MM-DD"),
  lessons: z.array(LessonSchema).min(1).max(8),
});

export type LessonCardInput = z.infer<typeof LessonCardSchema>;

// --- rule checks -----------------------------------------------------------

/** Words, ignoring the <b>/<i> markup allowed in explanations. */
export function words(s: string): number {
  return s.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

/** SPEC section 5 limits, in words. */
export const LIMITS = {
  why: 45,
  factTitle: 25,
  factDetail: 45,
  stepText: 35,
  tipBody: 40,
  option: 20,
  question: 35,
} as const;

const ALLOWED_TAGS = /<\/?(b|i)>/g;

/** Rule problems for one card, as human-readable strings. Empty = passes. */
export function ruleProblems(c: LessonCardInput): string[] {
  const out: string[] = [];
  const over = (label: string, s: string, max: number) => {
    const n = words(s);
    if (n > max) out.push(`${label} is ${n} words (max ${max})`);
  };
  const markup = (label: string, s: string) => {
    if (/[<>]/.test(s.replace(ALLOWED_TAGS, ""))) out.push(`${label} has HTML other than <b>/<i>`);
  };

  switch (c.type) {
    case "quiz": {
      over("question", c.q, LIMITS.question);
      over("why", c.why, LIMITS.why);
      markup("why", c.why);
      c.options.forEach((o, i) => over(`option ${i + 1}`, o, LIMITS.option));
      const norm = c.options.map((o) => o.trim().toLowerCase());
      if (new Set(norm).size !== norm.length) out.push("options are not all different");
      if (norm.some((o) => o === c.q.trim().toLowerCase())) out.push("an option repeats the question");
      break;
    }
    case "tf":
      over("statement", c.statement, LIMITS.question);
      over("why", c.why, LIMITS.why);
      markup("why", c.why);
      {
        // The bold lead-in states the verdict: "<b>False.</b>", "<b>Mostly false.</b>"…
        const lead = /^<b>([^<]*)<\/b>/.exec(c.why)?.[1] ?? "";
        const verdict = /\b(true|false)\b/i.exec(lead)?.[1]?.toLowerCase();
        if (!verdict) out.push('why should open with a bold verdict, e.g. "<b>False.</b>"');
        else if ((verdict === "true") !== c.answer) out.push(`why says "${lead}" but answer is ${c.answer}`);
      }
      break;
    case "fact":
      over("title", c.title, LIMITS.factTitle);
      over("detail", c.detail, LIMITS.factDetail);
      break;
    case "explainer":
      c.steps.forEach((s, i) => over(`step ${i + 1}`, s.p, LIMITS.stepText));
      break;
    case "tip":
      over("body", c.body, LIMITS.tipBody);
      break;
    case "trick":
      over("body", c.body, LIMITS.tipBody);
      break;
  }
  return out;
}

/** Problems for a whole lesson: every card's rules, plus lesson-level rules. */
export function lessonProblems(cards: LessonCardInput[]): string[] {
  const out: string[] = [];
  cards.forEach((c, i) => ruleProblems(c).forEach((p) => out.push(`card ${i + 1} (${c.type}): ${p}`)));
  const questions = cards.filter((c) => c.type === "quiz" || c.type === "tf").length;
  if (questions < 2) out.push(`only ${questions} question card(s); a lesson needs at least 2`);
  if (new Set(cards.map((c) => c.type)).size < 3) out.push("needs at least 3 different card types");
  return out;
}
