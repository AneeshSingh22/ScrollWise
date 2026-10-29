"use client";

import { useState } from "react";
import type {
  ExplainerCard,
  FactCard,
  IntroCard,
  NewsCard,
  TipCard,
  TrickCard,
} from "@/types/card";

export function IntroBody(_: { card: IntroCard }) {
  return (
    <div className="body">
      <p className="eyebrow">Your 15-minute feed</p>
      <h2 className="big">Swap the scroll for something that sticks.</h2>
      <p className="lead">
        AI, how tech works, life skills, the world, and mental math. Answer quizzes
        for XP. Misses come back later so they stick.
      </p>
      <p className="aside">Swipe up to start. Double-tap any card to like it.</p>
    </div>
  );
}

export function FactBody({
  card,
  onReveal,
}: {
  card: FactCard;
  onReveal: () => void;
}) {
  const [shown, setShown] = useState(false);

  return (
    <div className="body">
      <h2 className="big">{card.title}</h2>
      {!shown && (
        <button
          className="btn reveal"
          onClick={() => {
            setShown(true);
            onReveal();
          }}
        >
          Why?
        </button>
      )}
      {shown && <p className="why">{card.detail}</p>}
    </div>
  );
}

export function NewsBody({
  card,
  onReveal,
}: {
  card: NewsCard;
  onReveal: () => void;
}) {
  const [shown, setShown] = useState(false);

  return (
    <div className="body">
      <h2 className="big">{card.headline}</h2>
      <ul className="bullets">
        {card.bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
      {!shown && (
        <button
          className="btn reveal"
          onClick={() => {
            setShown(true);
            onReveal();
          }}
        >
          Why it matters
        </button>
      )}
      {shown && <p className="why">{card.why_it_matters}</p>}
    </div>
  );
}

export function ExplainerBody({
  card,
  onDone,
}: {
  card: ExplainerCard;
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const last = step === card.steps.length - 1;

  function next() {
    if (last) {
      setDone(true);
      onDone();
      return;
    }
    setStep(step + 1);
  }

  return (
    <div className="body">
      <div className="segs">
        {card.steps.map((_, i) => (
          <i key={i} className={i <= step ? "on" : ""} />
        ))}
      </div>
      <h2 className="q">{card.title}</h2>
      <div className="step">
        <h3>{card.steps[step].h}</h3>
        <p>{card.steps[step].p}</p>
      </div>
      {last && card.aside && <p className="aside">{card.aside}</p>}
      <button className="btn next" onClick={next} disabled={done}>
        {last ? "Got it" : "Next step"}
      </button>
    </div>
  );
}

export function TipBody({
  card,
  onAccept,
}: {
  card: TipCard;
  onAccept: () => void;
}) {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="body">
      <h2 className="big">{card.title}</h2>
      <p className="lead">{card.body}</p>
      <div className="challenge">
        <p className="eyebrow">Try it today</p>
        <p>{card.challenge}</p>
        <button
          className="btn accept"
          disabled={accepted}
          onClick={() => {
            setAccepted(true);
            onAccept();
          }}
        >
          {accepted ? "Added to today" : "I'll try it"}
        </button>
      </div>
    </div>
  );
}

export function TrickBody({ card }: { card: TrickCard }) {
  return (
    <div className="body">
      <h2 className="big">{card.title}</h2>
      <p className="lead">{card.body}</p>
      <div className="example">
        {card.example}
        <small>With a carry: {card.example2}</small>
      </div>
    </div>
  );
}
