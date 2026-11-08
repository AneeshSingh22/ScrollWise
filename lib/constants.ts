import type { CardCategory, CardType } from "@/types/card";

/** Chip labels and category names. Copy is the prototype's. */
export const CATS: Record<"all" | CardCategory, string> = {
  all: "For you",
  ai: "AI",
  tech: "How it works",
  life: "Level up",
  world: "World",
  math: "Mental math",
  intro: "",
};

/** The small uppercase label above each card's headline. */
export const KIND: Record<CardType, string> = {
  news: "AI news",
  quiz: "Quiz",
  tf: "True or false",
  fact: "Did you know",
  explainer: "Explainer",
  tip: "Skill",
  trick: "Math trick",
  sprint: "Sprint",
  intro: "",
  summary: "",
  terms: "Key words",
};

/** Chip order in the header. */
export const FILTERS = ["all", "ai", "tech", "life", "world", "math"] as const;
export type Filter = (typeof FILTERS)[number];

/** XP per interaction (SPEC section 5). */
export const XP = {
  quizCorrect: 10,
  quizWrong: 2,
  reviewCorrect: 15,
  reveal: 2,
  explainerDone: 5,
  challengeAccepted: 5,
  sprintCorrect: 3,
  news: 2,
} as const;

/** Levels every 250 XP (SPEC section 8). */
export const XP_PER_LEVEL = 250;

export function levelFor(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export const SPRINT_MS = 45_000;

/**
 * Claude Code hand-off: the course screen's "Make it with Claude" button opens
 * a Claude Code cloud session on this repo with the prompt pre-filled
 * (claude.ai/code supports ?prompt= and ?repositories=). The session runs the
 * repo's /new-topic skill, validates, and pushes to main; Vercel deploys.
 */
export const GITHUB_REPO = "AneeshSingh22/ScrollWise";

export function claudeCodeUrl(prompt: string): string {
  const params = new URLSearchParams({ repositories: GITHUB_REPO });
  if (prompt.trim()) params.set("prompt", prompt.trim());
  return `https://claude.ai/code?${params.toString()}`;
}
