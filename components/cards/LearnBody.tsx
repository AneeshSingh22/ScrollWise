"use client";

import { useRef, useState } from "react";
import { claudeCodeUrl } from "@/lib/constants";
import {
  DAYS,
  dayByNumber,
  dayProgress,
  TOPICS,
  unitByKey,
  type Unit,
} from "@/lib/curriculum";

/**
 * The course screen. Top: the selected unit's lessons (today's course day by
 * default). Then a box to make a new topic with Claude, your custom topics,
 * and every day of the 30-day course. Nothing is locked.
 *
 * Built from the prototype's primitives (.body, .big, .lead, .eyebrow, .btn,
 * .opt) plus the .picks / .days list styles; no new visual language.
 */
export function LearnBody({
  today,
  selected,
  done,
  onSelectUnit,
  onStartLesson,
}: {
  /** Today's course day, or null until the client knows its local date. */
  today: number | null;
  /** Unit key shown at the top; null means today's course day. */
  selected: string | null;
  done: string[];
  onSelectUnit: (key: string) => void;
  onStartLesson: (lessonId: string) => void;
}) {
  const root = useRef<HTMLDivElement | null>(null);

  if (today === null) {
    // Server render and the first client frame: no local date yet.
    return <div className="body" ref={root} />;
  }

  const todayUnit = dayByNumber(today) ?? DAYS[0];
  const unit: Unit = (selected && unitByKey(selected)) || todayUnit;
  const isToday = unit.key === todayUnit.key;
  const progress = dayProgress(unit, done);

  function select(key: string) {
    onSelectUnit(key);
    // The lists scroll inside the card; jump back up to the lessons.
    root.current?.closest(".content")?.scrollTo({ top: 0, behavior: "smooth" });
  }

  const eyebrow =
    unit.kind === "day"
      ? `${isToday ? "Today · " : ""}Day ${unit.day} of ${DAYS.length}`
      : "Your topic";

  return (
    <div className="body" ref={root}>
      <p className="eyebrow">
        {eyebrow}
        {progress ? ` · ${progress}/${unit.lessons.length} done` : ""}
      </p>
      <h2 className="big">{unit.topic}</h2>
      <p className="lead">{unit.blurb}</p>

      <ul className="picks">
        {unit.lessons.map((l) => {
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
        <button className="btn ghost" onClick={() => select(todayUnit.key)}>
          Back to today (Day {todayUnit.day})
        </button>
      )}

      <AskClaude />

      {TOPICS.length > 0 && (
        <UnitList
          title="Your topics"
          units={TOPICS}
          current={unit.key}
          done={done}
          onSelect={select}
          marker={() => "★"}
        />
      )}

      <UnitList
        title={`The course · all ${DAYS.length} days`}
        units={DAYS}
        current={unit.key}
        done={done}
        onSelect={select}
        marker={(u) => String(u.day)}
        badge={(u, p) =>
          u.day === today ? (
            <em>Today</em>
          ) : u.day! < today && p < u.lessons.length ? (
            <em className="missed">Catch up</em>
          ) : null
        }
      />
    </div>
  );
}

function UnitList({
  title,
  units,
  current,
  done,
  onSelect,
  marker,
  badge,
}: {
  title: string;
  units: Unit[];
  current: string;
  done: string[];
  onSelect: (key: string) => void;
  marker: (u: Unit) => string;
  badge?: (u: Unit, progress: number) => React.ReactNode;
}) {
  return (
    <div className="course">
      <p className="eyebrow">{title}</p>
      <ul className="days">
        {units.map((u) => {
          const p = dayProgress(u, done);
          const complete = p === u.lessons.length;
          return (
            <li key={u.key}>
              <button
                className={`day-row${complete ? " complete" : ""}`}
                aria-current={u.key === current ? "true" : undefined}
                onClick={() => onSelect(u.key)}
              >
                <span className="day-n">{complete ? "✓" : marker(u)}</span>
                <span className="day-topic">
                  {u.topic}
                  {badge?.(u, p)}
                </span>
                <span className="day-prog">
                  {p}/{u.lessons.length}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Hands off to Claude Code: opens a cloud session on this repo with the
 * prompt pre-filled. The prompt is also copied, as a fallback in case the
 * link opens somewhere that doesn't pick up the pre-fill.
 */
function AskClaude() {
  const [text, setText] = useState("");
  const [sent, setSent] = useState<string | null>(null);

  function go(prompt: string) {
    // Best effort; the link works without it.
    void navigator.clipboard?.writeText(prompt).catch(() => {});
    setSent(prompt);
    window.open(claudeCodeUrl(prompt), "_blank", "noopener");
  }

  const topic = text.trim();

  return (
    <div className="course ask">
      <p className="eyebrow">Learn anything</p>
      <p className="aside">
        Type a topic and Claude Code builds 4 lessons, checks them and puts them live here — about
        5–10 minutes, on your Claude plan.
      </p>
      <input
        className="ask-input"
        type="text"
        inputMode="text"
        enterKeyHint="go"
        placeholder="e.g. Quantum physics, the Roman Empire…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && topic) go(`/new-topic ${topic}`);
        }}
        aria-label="Topic to learn"
      />
      <div className="actions">
        <button className="btn" disabled={!topic} onClick={() => go(`/new-topic ${topic}`)}>
          Make it with Claude
        </button>
        <button
          className="btn ghost"
          onClick={() => go(topic ? `In the Scrollwise app: ${topic}` : "")}
        >
          Ask Claude to change the app
        </button>
      </div>
      {sent !== null && (
        <p className="source">
          Opened Claude Code{sent ? " — the prompt is also copied, paste it if the box is empty" : ""}.
          When Claude says it&apos;s live, come back here and tap the refresh banner.
        </p>
      )}
    </div>
  );
}
