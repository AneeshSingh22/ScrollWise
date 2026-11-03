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
import { PickerBody } from "./cards/PickerBody";
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
  /** Session mode: pick a fixed session from the menu card. */
  onPickSession: (id: string) => void;
  /** Session mode: return to the menu card from the finish card. */
  onBackToSessions: () => void;
};

/** Session-mode context for the menu and finish cards. */
export type SessionMode = {
  /** The running session's title, for the finish card. */
  title: string;
  /** Session ids finished today. */
  done: string[];
};

type Props = {
  card: Card;
  liked: boolean;
  saved: boolean;
  stats: SessionStats;
  cb: CardCallbacks;
  /** Present only in session mode; absent in the normal topic feed. */
  session?: SessionMode;
};

type Burst = { id: number; x: number; y: number };

/** Double-tap window, matching the prototype. */
const DOUBLE_TAP_MS = 320;

export function CardView({ card, liked, saved, stats, cb, session }: Props) {
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

        <Body card={card} stats={stats} cb={cb} session={session} />

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
  session,
}: {
  card: Card;
  stats: SessionStats;
  cb: CardCallbacks;
  session?: SessionMode;
}) {
  switch (card.type) {
    case "intro":
      // In session mode the lead card is the session menu, not the pitch.
      return session ? (
        <PickerBody done={session.done} onPick={cb.onPickSession} />
      ) : (
        <IntroBody card={card} />
      );
    case "summary":
      // In session mode the closing card sends you back to work.
      return session ? (
        <FinishBody
          stats={stats}
          sessionTitle={session.title}
          doneCount={session.done.length}
          onBackToSessions={cb.onBackToSessions}
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
