"use client";

import { useRef, useState } from "react";
import { CATS, KIND } from "@/lib/constants";
import { baseId } from "@/lib/deck";
import type { Card } from "@/types/card";
import { BurstHeart, HeartIcon, LessIcon, SaveIcon } from "./icons";
import { QuizBody, TfBody } from "./cards/QuizBody";
import {
  ExplainerBody,
  FactBody,
  IntroBody,
  NewsBody,
  TipBody,
  TrickBody,
} from "./cards/SimpleBodies";
import { SprintBody } from "./cards/SprintBody";
import { SummaryBody, type SessionStats } from "./cards/SummaryBody";
import { LearnBody } from "./cards/LearnBody";
import { FinishBody } from "./cards/FinishBody";

export type CardCallbacks = {
  onAnswer: (card: Card, correct: boolean) => void;
  onReveal: () => void;
  onExplainerDone: () => void;
  onChallengeAccepted: () => void;
  onSprintCorrect: () => void;
  onLike: (card: Card, on: boolean) => void;
  onSave: (card: Card) => void;
  onFewer: (card: Card) => void;
  onAnother: () => void;
  /** Course: open a day on the course screen. */
  onSelectDay: (day: number) => void;
  /** Course: start (or replay) a lesson. */
  onStartLesson: (lessonId: string) => void;
  /** Course: back to the course screen. */
  onOpenCourse: () => void;
};

/** Course context for the course screen and the end-of-lesson card. */
export type LearnContext = {
  today: number | null;
  /** Day shown on the course screen; null means today. */
  selectedDay: number | null;
  /** The running lesson, when one is open. */
  lessonId: string | null;
  done: string[];
};

type Props = {
  card: Card;
  liked: boolean;
  saved: boolean;
  stats: SessionStats;
  cb: CardCallbacks;
  /** Present only in course mode; absent in the normal topic feed. */
  learn?: LearnContext;
};

type Burst = { id: number; x: number; y: number };

/** Double-tap window, matching the prototype. */
const DOUBLE_TAP_MS = 320;

export function CardView({ card, liked, saved, stats, cb, learn }: Props) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const lastTap = useRef(0);
  const burstId = useRef(0);

  const isChrome = card.type === "intro" || card.type === "summary";

  function addBurst(x: number, y: number) {
    const id = ++burstId.current;
    setBursts((b) => [...b, { id, x, y }]);
    setTimeout(() => setBursts((b) => b.filter((h) => h.id !== id)), 700);
  }

  /** Double-tap anywhere on a card (outside a button) likes it. */
  function onCardClick(e: React.MouseEvent<HTMLElement>) {
    if (isChrome) return;
    if ((e.target as HTMLElement).closest("button")) return;

    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      const r = e.currentTarget.getBoundingClientRect();
      addBurst(e.clientX - r.left, e.clientY - r.top);
      if (!liked) cb.onLike(card, true);
      return;
    }
    lastTap.current = now;
  }

  return (
    <section className={`card c-${card.cat}`} data-id={card.id} onClick={onCardClick}>
      <div className="glow" />
      <div className="content">
        <div className="meta">
          {!isChrome && <span className="tag">{CATS[card.cat]}</span>}
          <span className="kind">{KIND[card.type]}</span>
          {card.review && <span className="tag review">Review</span>}
        </div>

        <Body card={card} stats={stats} cb={cb} learn={learn} />

        {card.source && (
          <p className="source">
            Source:{" "}
            {card.source_url ? (
              <a href={card.source_url} target="_blank" rel="noopener noreferrer">
                {card.source}
              </a>
            ) : (
              card.source
            )}
          </p>
        )}
      </div>

      {!isChrome && (
        <div className="rail">
          <button
            className={`r-like${liked ? " liked" : ""}`}
            aria-label="Like"
            aria-pressed={liked}
            onClick={() => cb.onLike(card, !liked)}
          >
            <HeartIcon filled={liked} />
            <span>Like</span>
          </button>
          <button
            className={`r-save${saved ? " on" : ""}`}
            aria-label="Save"
            aria-pressed={saved}
            onClick={() => cb.onSave(card)}
          >
            <SaveIcon />
            <span>Save</span>
          </button>
          <button className="r-less" aria-label="Fewer like this" onClick={() => cb.onFewer(card)}>
            <LessIcon />
            <span>Fewer</span>
          </button>
        </div>
      )}

      {bursts.map((b) => (
        <div key={b.id} className="heart" style={{ left: b.x, top: b.y }}>
          <BurstHeart />
        </div>
      ))}
    </section>
  );
}

function Body({
  card,
  stats,
  cb,
  learn,
}: {
  card: Card;
  stats: SessionStats;
  cb: CardCallbacks;
  learn?: LearnContext;
}) {
  switch (card.type) {
    case "intro":
      // In course mode the lead card is the course screen, not the pitch.
      return learn ? (
        <LearnBody
          today={learn.today}
          selected={learn.selectedDay}
          done={learn.done}
          onSelectDay={cb.onSelectDay}
          onStartLesson={cb.onStartLesson}
        />
      ) : (
        <IntroBody card={card} />
      );
    case "summary":
      // A lesson's closing card sends you back to work.
      return learn?.lessonId ? (
        <FinishBody
          stats={stats}
          lessonId={learn.lessonId}
          done={learn.done}
          onNext={cb.onStartLesson}
          onCourse={cb.onOpenCourse}
        />
      ) : (
        <SummaryBody stats={stats} onAnother={cb.onAnother} />
      );
    case "quiz":
      return <QuizBody card={card} onAnswer={(ok) => cb.onAnswer(card, ok)} />;
    case "tf":
      return <TfBody card={card} onAnswer={(ok) => cb.onAnswer(card, ok)} />;
    case "fact":
      return <FactBody card={card} onReveal={cb.onReveal} />;
    case "news":
      return <NewsBody card={card} onReveal={cb.onReveal} />;
    case "explainer":
      return <ExplainerBody card={card} onDone={cb.onExplainerDone} />;
    case "tip":
      return <TipBody card={card} onAccept={cb.onChallengeAccepted} />;
    case "trick":
      return <TrickBody card={card} />;
    case "sprint":
      return <SprintBody onCorrect={cb.onSprintCorrect} />;
  }
}

export { baseId };
