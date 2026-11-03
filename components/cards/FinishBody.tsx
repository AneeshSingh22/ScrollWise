"use client";

import { useState } from "react";
import { SESSIONS } from "@/lib/sessions";
import type { SessionStats } from "./SummaryBody";

/**
 * End-of-session card for the fixed day sessions. Same primitives as the
 * prototype's summary card (.stats/.stat/.actions), different copy: this one
 * closes the break and points back at work, which is the whole point of
 * using it during the workday.
 */

function praise(accuracy: number | null, answered: number): string {
  if (answered === 0) return "Break taken. That still beats the feed.";
  if (accuracy === null) return "Session complete.";
  if (accuracy >= 90) return "That was a hard set and you walked it.";
  if (accuracy >= 70) return "Strong round on genuinely difficult material.";
  if (accuracy >= 50) return "Solid work — these were meant to be hard.";
  return "Brutal set. The misses are the useful part.";
}

export function FinishBody({
  stats,
  sessionTitle,
  doneCount,
  onBackToSessions,
}: {
  stats: SessionStats;
  sessionTitle: string;
  doneCount: number;
  onBackToSessions: () => void;
}) {
  const [closed, setClosed] = useState(false);

  const accuracy = stats.answered
    ? Math.round((stats.correct / stats.answered) * 100)
    : null;
  const remaining = SESSIONS.length - doneCount;

  return (
    <div className="body">
      <p className="eyebrow">Break complete · {sessionTitle}</p>
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

      {closed ? (
        <>
          <p className="lead">
            Phone down. Pick the one thing you were working on before this and
            start with its smallest next step.
          </p>
          <p className="aside">
            {remaining > 0
              ? `${remaining} session${remaining > 1 ? "s" : ""} left for later today.`
              : "All four sessions done today."}
          </p>
        </>
      ) : (
        <>
          <p className="lead">
            You spent the break on something that compounds instead of something
            that evaporates. Now close the app while it still feels like a good
            trade — that is the habit worth keeping.
          </p>
          <div className="challenge">
            <p className="eyebrow">Back to it</p>
            <p>
              {remaining > 0
                ? `${remaining} more session${remaining > 1 ? "s" : ""} waiting whenever you earn the next break.`
                : "That is all four. Nothing left to scroll — go finish the work."}
            </p>
            <button className="btn" onClick={() => setClosed(true)}>
              Back to work
            </button>
          </div>
          <button className="btn ghost" onClick={onBackToSessions}>
            Session list
          </button>
        </>
      )}
    </div>
  );
}
