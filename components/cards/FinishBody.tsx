"use client";

import { useState } from "react";
import {
  DAYS,
  dayProgress,
  lessonById,
  nextLesson,
  unitOfLesson,
} from "@/lib/curriculum";
import type { SessionStats } from "./SummaryBody";

/**
 * End-of-lesson card. Same primitives as the prototype's summary card
 * (.stats/.stat/.actions/.challenge). It closes the break and points back at
 * work, and offers the next lesson for when you have time for more.
 */

function praise(accuracy: number | null, answered: number): string {
  if (answered === 0) return "Lesson done. That still beats the feed.";
  if (accuracy === null) return "Lesson complete.";
  if (accuracy >= 90) return "Sharp. You walked that one.";
  if (accuracy >= 70) return "Strong round — that stuff isn't easy.";
  if (accuracy >= 50) return "Solid. The misses are where the learning is.";
  return "Tough one. Your misses come back as review cards.";
}

export function FinishBody({
  stats,
  lessonId,
  done,
  onNext,
  onCourse,
}: {
  stats: SessionStats;
  lessonId: string;
  done: string[];
  onNext: (lessonId: string) => void;
  onCourse: () => void;
}) {
  const [closed, setClosed] = useState(false);

  const lesson = lessonById(lessonId);
  const unit = unitOfLesson(lessonId);
  const next = nextLesson(lessonId);
  const nextUnit = next ? unitOfLesson(next.id) : undefined;
  // Count this lesson as done even if the profile write hasn't landed yet.
  const doneNow = done.includes(lessonId) ? done : [...done, lessonId];
  const unitDone = unit ? dayProgress(unit, doneNow) : 0;
  const unitComplete = !!unit && unitDone === unit.lessons.length;
  const courseComplete =
    unit?.kind === "day" && DAYS.every((d) => dayProgress(d, doneNow) === d.lessons.length);

  const accuracy = stats.answered
    ? Math.round((stats.correct / stats.answered) * 100)
    : null;

  return (
    <div className="body">
      <p className="eyebrow">
        {unit ? (unit.kind === "day" ? `Day ${unit.day} · ${unit.topic}` : unit.topic) : "Lesson"} ·{" "}
        {unitDone}/{unit?.lessons.length ?? 4}
      </p>
      <h2 className="big">{praise(accuracy, stats.answered)}</h2>

      <div className="stats">
        <div className="stat">
          <b>{stats.seen}</b>
          <span>cards</span>
        </div>
        <div className="stat">
          <b>{accuracy === null ? "–" : `${accuracy}%`}</b>
          <span>accuracy</span>
        </div>
        <div className="stat">
          <b>{stats.xp}</b>
          <span>XP earned</span>
        </div>
      </div>

      {courseComplete ? (
        <p className="lead">
          That was the last lesson of all {DAYS.length} days. You just finished the whole course.
        </p>
      ) : unitComplete ? (
        <p className="lead">
          {unit!.kind === "day" ? `That's all of Day ${unit!.day}. ` : "Topic complete. "}You now know
          more about {unit!.topic.toLowerCase()} than most people ever will.
        </p>
      ) : (
        <p className="lead">
          You spent the break on something that compounds instead of something that evaporates.
        </p>
      )}

      {closed ? (
        <p className="lead">
          Phone down. Pick up the thing you were working on and start with its smallest next step.
        </p>
      ) : (
        <div className="challenge">
          <p className="eyebrow">Good educational break</p>
          <p>Close the app while it still feels like a good trade — that&apos;s the habit worth keeping.</p>
          <button className="btn" onClick={() => setClosed(true)}>
            Back to work
          </button>
        </div>
      )}

      <div className="actions">
        {next && (
          <button className="btn ghost" onClick={() => onNext(next.id)}>
            {next.unit === lesson?.unit
              ? `Next: ${next.title}`
              : `Start Day ${nextUnit?.day}: ${nextUnit?.topic}`}
          </button>
        )}
        <button className="btn ghost" onClick={onCourse}>
          Course
        </button>
      </div>
    </div>
  );
}
