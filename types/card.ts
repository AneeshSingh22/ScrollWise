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
  | "summary";

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

export type IntroCard = Common & { type: "intro" };
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
};

export type TfCard = Common & {
  type: "tf";
  statement: string;
  answer: boolean;
  why: string;
};

export type FactCard = Common & {
  type: "fact";
  title: string;
  detail: string;
};

export type ExplainerStep = { h: string; p: string };

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
