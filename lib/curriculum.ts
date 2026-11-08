import type { Card, Category, SummaryCard, TermsCard, Visual } from "@/types/card";
import { termsIn } from "./glossary";
import { dayKey } from "./store";
import { RAW_DAYS } from "./curriculum-data";
import { RAW_TOPICS } from "./topics-data";
import { shuffleQuiz } from "./shuffle";

/**
 * Learning content, organized as units of lessons. There are two kinds:
 *
 * - Course days: the 30-day AI course (data/curriculum/day-NN.json), one topic
 *   per day, four lessons each. "Today" is computed from COURSE_START in local
 *   time; every day stays open.
 * - Custom topics: anything you ask for with /new-topic (data/topics/*.json),
 *   shown under "Your topics".
 *
 * Content files hold only content. This module fills in ids, category and
 * difficulty, so a file can't get an id wrong and every card id is stable for
 * saving and reviews. scripts/build-indexes.ts validates the files first.
 */

export const COURSE_START = "2026-11-03";
export const LESSONS_PER_DAY = 4;

/** A card as written in a content file: no id or category yet. */
export type RawCard = Omit<Card, "id" | "cat"> & { cat?: Category; id?: string };
export type RawLesson = { title: string; cards: RawCard[] };

export type RawDay = {
  day: number;
  slug: string;
  topic: string;
  cat: Category;
  blurb: string;
  lessons: RawLesson[];
};

export type RawTopic = Omit<RawDay, "day"> & { created: string };

export type Lesson = {
  id: string;
  /** 1-based position within its unit. */
  n: number;
  /** Key of the unit this lesson belongs to. */
  unit: string;
  title: string;
  cards: Card[];
};

export type Unit = {
  /** "day-1" or "topic-quantum-computing". */
  key: string;
  kind: "day" | "topic";
  /** Course day number; undefined for custom topics. */
  day?: number;
  slug: string;
  topic: string;
  cat: Category;
  blurb: string;
  created?: string;
  lessons: Lesson[];
};

/** Back-compat name: a course day is a unit with a day number. */
export type Day = Unit & { day: number };

const pad = (n: number) => String(n).padStart(2, "0");

function buildUnit(
  key: string,
  idPrefix: string,
  raw: Omit<RawTopic, "created"> & { created?: string },
  extra: Pick<Unit, "kind" | "day">,
): Unit {
  return {
    key,
    ...extra,
    slug: raw.slug,
    topic: raw.topic,
    cat: raw.cat,
    blurb: raw.blurb,
    created: raw.created,
    lessons: raw.lessons.map((l, li) => {
      const id = `${idPrefix}-l${li + 1}`;
      return {
        id,
        n: li + 1,
        unit: key,
        title: l.title,
        cards: l.cards.map((c, ci) =>
          shuffleQuiz({
            difficulty: 2,
            ...c,
            id: `${id}-c${ci + 1}`,
            cat: c.cat ?? raw.cat,
          } as Card),
        ),
      };
    }),
  };
}

export function normalizeDay(raw: RawDay): Day {
  return buildUnit(`day-${raw.day}`, `d${pad(raw.day)}`, raw, {
    kind: "day",
    day: raw.day,
  }) as Day;
}

export function normalizeTopic(raw: RawTopic): Unit {
  return buildUnit(`topic-${raw.slug}`, `t-${raw.slug}`, raw, { kind: "topic" });
}

export const DAYS: Day[] = RAW_DAYS.map(normalizeDay).sort((a, b) => a.day - b.day);

/** Custom topics, newest first. */
export const TOPICS: Unit[] = RAW_TOPICS.map(normalizeTopic).sort((a, b) =>
  (b.created ?? "").localeCompare(a.created ?? "") || a.topic.localeCompare(b.topic),
);

export const UNITS: Unit[] = [...DAYS, ...TOPICS];
export const ALL_LESSONS: Lesson[] = UNITS.flatMap((u) => u.lessons);

export function dayByNumber(n: number): Day | undefined {
  return DAYS.find((d) => d.day === n);
}

export function unitByKey(key: string): Unit | undefined {
  return UNITS.find((u) => u.key === key);
}

export function lessonById(id: string): Lesson | undefined {
  return ALL_LESSONS.find((l) => l.id === id);
}

export function unitOfLesson(id: string): Unit | undefined {
  const l = lessonById(id);
  return l ? unitByKey(l.unit) : undefined;
}

/**
 * The lesson after this one: the next in its unit; after a course day's last
 * lesson, the next day's first. A custom topic ends after its last lesson.
 */
export function nextLesson(id: string): Lesson | undefined {
  const unit = unitOfLesson(id);
  if (!unit) return undefined;
  const i = unit.lessons.findIndex((l) => l.id === id);
  if (unit.lessons[i + 1]) return unit.lessons[i + 1];
  if (unit.kind === "day" && unit.day) return dayByNumber(unit.day + 1)?.lessons[0];
  return undefined;
}

/** Every content card, for looking a saved card up by id. */
export function courseCardById(id: string): Card | undefined {
  for (const l of ALL_LESSONS) {
    const c = l.cards.find((x) => x.id === id);
    if (c) return c;
  }
  return undefined;
}

/**
 * Which course day "today" is, in local time. Before the start it is day 1;
 * after the last day it stays on the last day.
 */
export function todayDayNumber(now: Date = new Date()): number {
  const [y, m, d] = COURSE_START.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const [ty, tm, td] = dayKey(now).split("-").map(Number);
  const today = new Date(ty, tm - 1, td);
  // Round, not floor: a DST shift makes one day 23 or 25 hours long.
  const diff = Math.round((today.getTime() - start.getTime()) / 864e5);
  return Math.min(Math.max(diff + 1, 1), Math.max(DAYS.length, 1));
}

/** Most key words shown on a lesson's opening card. */
export const MAX_KEY_WORDS = 8;

function visualText(v?: Visual): string[] {
  if (!v) return [];
  switch (v.kind) {
    case "flow":
    case "cells":
      return [...v.items, v.caption ?? ""];
    case "bars":
      return [...v.items.map((i) => i.label), v.caption ?? ""];
    case "compare":
      return [v.left.title, ...v.left.points, v.right.title, ...v.right.points, v.caption ?? ""];
    case "picture":
      return [v.caption];
    case "line":
      return [v.x, v.y, v.caption ?? ""];
  }
}

/** All the words a reader sees on a card, for finding its jargon. */
export function cardText(c: Card): string[] {
  switch (c.type) {
    case "quiz":
      return [c.q, ...c.options, c.hint ?? "", c.why, ...visualText(c.visual)];
    case "tf":
      return [c.statement, c.hint ?? "", c.why, ...visualText(c.visual)];
    case "fact":
      return [c.title, c.detail, ...visualText(c.visual)];
    case "explainer":
      return [
        c.title,
        ...c.steps.flatMap((s) => [s.h, s.p, s.analogy ?? "", ...visualText(s.visual)]),
        c.aside ?? "",
      ];
    case "tip":
      return [c.title, c.body, c.challenge];
    case "trick":
      return [c.title, c.body, c.example, c.example2];
    case "news":
      return [c.headline, ...c.bullets, c.why_it_matters];
    default:
      return [];
  }
}

/** The opening "Key words" card for a lesson, or null if it uses little jargon. */
export function keyWordsCard(lessonId: string, cards: Card[], cat: Category): TermsCard | null {
  const terms = termsIn(cards.flatMap(cardText)).slice(0, MAX_KEY_WORDS);
  if (terms.length < 2) return null;
  return {
    id: `terms-${lessonId}`,
    cat,
    type: "terms",
    terms: terms.map(({ term, full, means }) => ({ term, full, means })),
  };
}

/** A lesson's cards for the feed: key words first, closed by its finish card. */
export function buildLesson(id: string): Card[] {
  const l = lessonById(id);
  if (!l) return [];
  const unit = unitByKey(l.unit);
  const words = keyWordsCard(id, l.cards, unit?.cat ?? "ai");
  const finish: SummaryCard = { id: `summary-${id}`, cat: "intro", type: "summary" };
  return [...(words ? [words] : []), ...l.cards, finish];
}

/** Lessons finished in a unit. */
export function dayProgress(unit: Unit, done: string[]): number {
  return unit.lessons.filter((l) => done.includes(l.id)).length;
}

/** The first unfinished lesson of a unit, or its first lesson if all are done. */
export function resumeLesson(unit: Unit, done: string[]): Lesson {
  return unit.lessons.find((l) => !done.includes(l.id)) ?? unit.lessons[0];
}
