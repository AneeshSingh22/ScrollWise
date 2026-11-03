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
  /** True while the course screen or a lesson is showing. */
  learnActive: boolean;
  /** e.g. "Learn 1/4" — today's lessons done. */
  learnLabel: string;
  onOpenLearn: () => void;
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
  learnActive,
  learnLabel,
  onOpenLearn,
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
        {/* The course sits first, beside the topic chips: lessons on the
            left, the open-ended scroll feed to the right. */}
        <button className="chip" aria-pressed={learnActive} onClick={onOpenLearn}>
          {learnLabel}
        </button>
        {FILTERS.map((k) => (
          <button
            key={k}
            className="chip"
            aria-pressed={!learnActive && k === filter}
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
