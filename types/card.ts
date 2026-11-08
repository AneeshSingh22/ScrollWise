/**
 * Card shapes. Mirrors SPEC.md section 5. The seed deck in data/seed-cards.json
 * uses these types; Phase 1 adds Zod schemas and Supabase-backed cards on top.
 */

export type Category = "ai" | "tech" | "life" | "world" | "math";

/** "intro" and "summary" are UI-only cards — never stored, never generated. */
export type CardCategory = Category | "intro";

export type CardType =
  | "news"
  | "quiz"
  | "tf"
  | "fact"
  | "explainer"
  | "tip"
  | "trick"
  | "sprint"
  | "intro"
  | "summary"
  | "terms";

type Common = {
  id: string;
  cat: CardCategory;
  /** Set on a re-served miss; shows the "Review" badge and pays 15 XP. */
  review?: boolean;
  source?: string;
  source_url?: string;
  difficulty?: 1 | 2 | 3;
  tags?: string[];
};

/**
 * A simple picture drawn by the app (no image files): a flow of boxes, a bar
 * chart, a side-by-side comparison, a row of cells (bits, tokens…), a big
 * emoji scene, or a line chart. Kept deliberately basic and readable.
 */
export type Visual =
  | { kind: "flow"; items: string[]; caption?: string }
  | { kind: "bars"; items: { label: string; value: number; note?: string }[]; unit?: string; caption?: string }
  | { kind: "compare"; left: { title: string; points: string[] }; right: { title: string; points: string[] }; caption?: string }
  | { kind: "cells"; items: string[]; labels?: string[]; caption?: string }
  | { kind: "picture"; icons: string; caption: string }
  | { kind: "line"; points: [number, number][]; x: string; y: string; caption?: string };

export type IntroCard = Common & { type: "intro" };

/** UI-made: opens a lesson with the jargon it uses, in plain words. */
export type TermsCard = Common & {
  type: "terms";
  terms: { term: string; full?: string; means: string }[];
};
export type SummaryCard = Common & { type: "summary" };

export type NewsCard = Common & {
  type: "news";
  headline: string;
  bullets: [string, string, string];
  why_it_matters: string;
};

export type QuizCard = Common & {
  type: "quiz";
  q: string;
  options: string[];
  /** Index into options. */
  answer: number;
  /** May contain <b> for the lead-in, as in the prototype. */
  why: string;
  /** A nudge shown on request before answering. */
  hint?: string;
  /** Shown with the explanation after answering. */
  visual?: Visual;
};

export type TfCard = Common & {
  type: "tf";
  statement: string;
  answer: boolean;
  why: string;
  hint?: string;
  visual?: Visual;
};

export type FactCard = Common & {
  type: "fact";
  title: string;
  detail: string;
  visual?: Visual;
};

export type ExplainerStep = {
  h: string;
  p: string;
  /** "Think of it like…": an everyday comparison. */
  analogy?: string;
  visual?: Visual;
};

export type ExplainerCard = Common & {
  type: "explainer";
  title: string;
  steps: ExplainerStep[];
  aside?: string;
};

export type TipCard = Common & {
  type: "tip";
  title: string;
  body: string;
  challenge: string;
};

export type TrickCard = Common & {
  type: "trick";
  title: string;
  body: string;
  example: string;
  example2: string;
};

export type SprintCard = Common & { type: "sprint" };

export type Card =
  | IntroCard
  | SummaryCard
  | TermsCard
  | NewsCard
  | QuizCard
  | TfCard
  | FactCard
  | ExplainerCard
  | TipCard
  | TrickCard
  | SprintCard;

/** Answerable card types — the ones that can be missed and come back as reviews. */
export type AnswerableCard = QuizCard | TfCard;

export function isAnswerable(c: Card): c is AnswerableCard {
  return c.type === "quiz" || c.type === "tf";
}
