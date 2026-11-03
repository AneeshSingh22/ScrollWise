"use client";

import { useRef } from "react";
import { DAYS, dayByNumber, dayProgress, LESSONS_PER_DAY } from "@/lib/curriculum";

/**
 * The course screen: the selected day's four lessons on top, and every day of
 * the course below. Nothing is locked — today is only the suggestion, missed
 * days stay here, and any day can be started early.
 *
 * Built from the prototype's primitives (.body, .big, .lead, .eyebrow, .btn)
 * plus the .picks list styles; no new visual language.
 */
export function LearnBody({
  today,
  selected,
  done,
  onSelectDay,
  onStartLesson,
}: {
  /** Today's course day, or null until the client knows its local date. */
  today: number | null;
  selected: number | null;
  done: string[];
  onSelectDay: (day: number) => void;
  onStartLesson: (lessonId: string) => void;
}) {
  const root = useRef<HTMLDivElement | null>(null);

  if (today === null) {
    // Server render and the first client frame: no local date yet.
    return <div className="body" ref={root} />;
  }

  const dayNo = selected ?? today;
  const day = dayByNumber(dayNo) ?? DAYS[0];
  const isToday = day.day === today;
  const progress = dayProgress(day, done);

  function select(n: number) {
    onSelectDay(n);
    // The course list scrolls inside the card; jump back up to the lessons.
    root.current?.closest(".content")?.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="body" ref={root}>
      <p className="eyebrow">
        {isToday ? "Today · " : ""}Day {day.day} of {DAYS.length}
        {progress ? ` · ${progress}/${LESSONS_PER_DAY} done` : ""}
      </p>
      <h2 className="big">{day.topic}</h2>
      <p className="lead">{day.blurb}</p>

      <ul className="picks">
        {day.lessons.map((l) => {
          const finished = done.includes(l.id);
          return (
            <li key={l.id}>
              <button
                className={`pick${finished ? " done" : ""}`}
                onClick={() => onStartLesson(l.id)}
              >
                <span className="pick-n">{finished ? "✓" : l.n}</span>
                <span className="pick-text">
                  <b>{l.title}</b>
                  <small>
                    {finished ? "Done — tap to replay" : `Lesson ${l.n} · ${l.cards.length} cards`}
                  </small>
                </span>
                <span className="pick-min">~4m</span>
              </button>
            </li>
          );
        })}
      </ul>

      {!isToday && (
        <button className="btn ghost" onClick={() => select(today)}>
          Back to today (Day {today})
        </button>
      )}

      <div className="course">
        <p className="eyebrow">The course · all {DAYS.length} days</p>
        <ul className="days">
          {DAYS.map((d) => {
            const p = dayProgress(d, done);
            const complete = p === d.lessons.length;
            return (
              <li key={d.day}>
                <button
                  className={`day-row${complete ? " complete" : ""}`}
                  aria-current={d.day === day.day ? "true" : undefined}
                  onClick={() => select(d.day)}
                >
                  <span className="day-n">{complete ? "✓" : d.day}</span>
                  <span className="day-topic">
                    {d.topic}
                    {d.day === today && <em>Today</em>}
                    {d.day < today && p < d.lessons.length && <em className="missed">Catch up</em>}
                  </span>
                  <span className="day-prog">
                    {p}/{d.lessons.length}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
