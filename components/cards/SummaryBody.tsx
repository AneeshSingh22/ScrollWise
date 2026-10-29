"use client";

import { useState } from "react";

export type SessionStats = {
  seen: number;
  answered: number;
  correct: number;
  xp: number;
};

export function SummaryBody({
  stats,
  onAnother,
}: {
  stats: SessionStats;
  onAnother: () => void;
}) {
  const [done, setDone] = useState(false);

  const accuracy = stats.answered
    ? `${Math.round((stats.correct / stats.answered) * 100)}%`
    : "–";
  const misses = stats.answered - stats.correct;

  return (
    <div className="body">
      <p className="eyebrow">Session complete</p>
      <h2 className="big">Nice. That beat Reels.</h2>
      <div className="stats">
        <div className="stat">
          <b>{stats.seen}</b>
          <span>cards</span>
        </div>
        <div className="stat">
          <b>{accuracy}</b>
          <span>quiz accuracy</span>
        </div>
        <div className="stat">
          <b>{stats.xp}</b>
          <span>XP earned</span>
        </div>
      </div>
      <p className="lead">
        {misses
          ? `${misses} miss${misses > 1 ? "es" : ""} will show up again as review cards so they stick.`
          : "Clean sweep on the quizzes. Tomorrow's feed gets harder."}
      </p>
      {done ? (
        <div className="actions">
          <p className="lead">See you tomorrow. Your streak is safe.</p>
        </div>
      ) : (
        <div className="actions">
          <button className="btn more" onClick={onAnother}>
            Another round
          </button>
          <button className="btn ghost done" onClick={() => setDone(true)}>
            I&apos;m done
          </button>
        </div>
      )}
    </div>
  );
}
