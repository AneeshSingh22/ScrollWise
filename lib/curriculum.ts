import type { Card, Category, SummaryCard } from "@/types/card";
import { dayKey } from "./store";
import { RAW_DAYS } from "./curriculum-data";
import { shuffleQuiz } from "./shuffle";

/**
 * The 30-day AI course: one topic per day, four lessons per day.
 *
 * Day files (data/curriculum/day-NN.json) hold only content. This module fills
 * in the bookkeeping — lesson and card ids, category, difficulty — so a file
 * cannot get an id wrong, and every card id is stable for saving and reviews.
 *
 * Every day is always open. "Today" is just the suggested day, computed from
 * COURSE_START in local time; missed days stay in the course list.
 */

export const COURSE_START = "2026-11-03";
export const LESSONS_PER_DAY = 4;

/** A card as written in a day file: no id or category yet. */
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

export type Lesson = {
  id: string;
  /** 1-based position within its day. */
  n: number;
  day: number;
  title: string;
  cards: Card[];
};

export type Day = {
  day: number;
  slug: string;
  topic: string;
  cat: Category;
  blurb: string;
  lessons: Lesson[];
};

const pad = (n: number) => String(n).padStart(2, "0");

export function normalizeDay(raw: RawDay): Day {
  return {
    day: raw.day,
    slug: raw.slug,
    topic: raw.topic,
    cat: raw.cat,
    blurb: raw.blurb,
    lessons: raw.lessons.map((l, li) => {
      const id = `d${pad(raw.day)}-l${li + 1}`;
      return {
        id,
        n: li + 1,
        day: raw.day,
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

export const DAYS: Day[] = RAW_DAYS.map(normalizeDay).sort((a, b) => a.day - b.day);

export const ALL_LESSONS: Lesson[] = DAYS.flatMap((d) => d.lessons);

export function dayByNumber(n: number): Day | undefined {
  return DAYS.find((d) => d.day === n);
}

export function lessonById(id: string): Lesson | undefined {
  return ALL_LESSONS.find((l) => l.id === id);
}

/** The lesson after this one: next in the day, else the first of the next day. */
export function nextLesson(id: string): Lesson | undefined {
  const i = ALL_LESSONS.findIndex((l) => l.id === id);
  return i >= 0 ? ALL_LESSONS[i + 1] : undefined;
}

/** Every course card, for looking a saved card up by id. */
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

/** A lesson's cards for the feed, closed by its finish card. */
export function buildLesson(id: string): Card[] {
  const l = lessonById(id);
  if (!l) return [];
  const finish: SummaryCard = { id: `summary-${id}`, cat: "intro", type: "summary" };
  return [...l.cards, finish];
}

/** Lessons finished out of a day's four. */
export function dayProgress(day: Day, done: string[]): number {
  return day.lessons.filter((l) => done.includes(l.id)).length;
}

/** The first unfinished lesson of a day, or its first lesson if all are done. */
export function resumeLesson(day: Day, done: string[]): Lesson {
  return day.lessons.find((l) => !done.includes(l.id)) ?? day.lessons[0];
}
