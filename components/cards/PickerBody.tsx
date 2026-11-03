"use client";

import { SESSIONS, type TodaySession } from "@/lib/sessions";

/**
 * The menu card at the top of session mode: today's four sessions, each a
 * fixed 10-minute set. Styled from the prototype's existing primitives
 * (.body, .big, .lead, .stat, .btn) — no new visual language.
 */
export function PickerBody({
  done,
  onPick,
}: {
  done: string[];
  onPick: (id: string) => void;
}) {
  const left = SESSIONS.length - done.length;

  return (
    <div className="body">
      <p className="eyebrow">Today · 4 sessions</p>
      <h2 className="big">Take a real break.</h2>
      <p className="lead">
        {left === 0
          ? "All four done. That is a genuinely good day of thinking."
          : `${left} of ${SESSIONS.length} left. Each one is about 10 minutes of hard questions — pick one and finish it.`}
      </p>
      <ul className="picks">
        {SESSIONS.map((s, i) => (
          <li key={s.id}>
            <button
              className={`pick${done.includes(s.id) ? " done" : ""}`}
              onClick={() => onPick(s.id)}
            >
              <span className="pick-n">{done.includes(s.id) ? "✓" : i + 1}</span>
              <span className="pick-text">
                <b>{s.title}</b>
                <small>{s.blurb}</small>
              </span>
              <span className="pick-min">{s.minutes}m</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type { TodaySession };
