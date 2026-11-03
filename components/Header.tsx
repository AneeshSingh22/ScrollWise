"use client";

import { CATS, FILTERS, type Filter } from "@/lib/constants";
import { SaveIcon, StreakIcon, XpIcon } from "./icons";

type Props = {
  xp: number;
  streak: number;
  savedCount: number;
  filter: Filter;
  progress: number;
  onFilter: (f: Filter) => void;
  onOpenSaved: () => void;
  xpPillRef: React.Ref<HTMLSpanElement>;
  /** Session mode: true while today's fixed sessions are showing. */
  sessionsActive: boolean;
  sessionsDone: number;
  sessionsTotal: number;
  onOpenSessions: () => void;
};

export function Header({
  xp,
  streak,
  savedCount,
  filter,
  progress,
  onFilter,
  onOpenSaved,
  xpPillRef,
  sessionsActive,
  sessionsDone,
  sessionsTotal,
  onOpenSessions,
}: Props) {
  return (
    <header className="top">
      <div className="row">
        <div className="mark">
          Scroll<span>wise</span>
        </div>
        <span className="pill" title="Day streak">
          <StreakIcon />
          <span>{streak}</span>
        </span>
        <span className="pill" title="XP earned" ref={xpPillRef}>
          <XpIcon />
          <span>{xp}</span> XP
        </span>
        <button className="pill" aria-label="Saved cards" onClick={onOpenSaved}>
          <SaveIcon />
          <span>{savedCount}</span>
        </button>
      </div>
      <div className="chips" role="group" aria-label="Topics">
        {/* Session mode lives alongside the topic chips: today's fixed
            sessions on the left, the open-ended topic feed to the right. */}
        <button
          className="chip"
          aria-pressed={sessionsActive}
          onClick={onOpenSessions}
        >
          Today {sessionsDone}/{sessionsTotal}
        </button>
        {FILTERS.map((k) => (
          <button
            key={k}
            className="chip"
            aria-pressed={!sessionsActive && k === filter}
            onClick={() => onFilter(k)}
          >
            {CATS[k]}
          </button>
        ))}
      </div>
      <div className="progress" aria-hidden="true">
        <i style={{ width: `${progress}%` }} />
      </div>
    </header>
  );
}
