"use client";

import { useState } from "react";
import type {
  ExplainerCard,
  FactCard,
  IntroCard,
  NewsCard,
  TermsCard,
  TipCard,
  TrickCard,
} from "@/types/card";
import { Rich } from "../rich/Rich";
import { Visual } from "../rich/Visual";
import { NextButton } from "./QuizBody";

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
      <Rich as="h2" className="big" text={card.title} />
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
      {shown && (
        <div className="explain">
          <Rich as="p" className="why" text={card.detail} />
          {card.visual && <Visual v={card.visual} />}
          <NextButton />
        </div>
      )}
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
      <Rich as="h2" className="big" text={card.headline} />
      <ul className="bullets">
        {card.bullets.map((b, i) => (
          <li key={i}>
            <Rich text={b} />
          </li>
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
      {shown && <Rich as="p" className="why" text={card.why_it_matters} />}
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
  const s = card.steps[step];

  function next() {
    if (last) {
      if (!done) onDone();
      setDone(true);
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
      <Rich as="h2" className="q" text={card.title} />
      <div className="step" key={step}>
        <p className="step-n">
          Step {step + 1} of {card.steps.length}
        </p>
        <Rich as="h3" text={s.h} />
        <Rich as="p" text={s.p} />
        {s.visual && <Visual v={s.visual} />}
        {s.analogy && (
          <p className="analogy">
            <span>Think of it like this</span>
            <Rich text={s.analogy} />
          </p>
        )}
      </div>
      {last && card.aside && <Rich as="p" className="aside" text={card.aside} />}
      <div className="actions">
        {step > 0 && (
          <button className="btn ghost" onClick={() => setStep(step - 1)}>
            Back
          </button>
        )}
        {done ? (
          <NextButton />
        ) : (
          <button className="btn next" onClick={next}>
            {last ? "Got it" : "Next step"}
          </button>
        )}
      </div>
    </div>
  );
}

/** Opens a lesson: the words it uses, explained before you need them. */
export function TermsBody({ card }: { card: TermsCard }) {
  return (
    <div className="body">
      <p className="eyebrow">Before you start</p>
      <h2 className="q">Words you&apos;ll meet in this lesson</h2>
      <dl className="glossary">
        {card.terms.map((t) => (
          <div key={t.term}>
            <dt>
              {t.term}
              {t.full && <small> · {t.full}</small>}
            </dt>
            <dd>{t.means}</dd>
          </div>
        ))}
      </dl>
      <p className="aside">Forgot one later? Tap any underlined word for its meaning.</p>
      <NextButton label="Start the lesson" />
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
      <Rich as="h2" className="big" text={card.title} />
      <Rich as="p" className="lead" text={card.body} />
      <div className="challenge">
        <p className="eyebrow">Try it today</p>
        <Rich as="p" text={card.challenge} />
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
      <Rich as="h2" className="big" text={card.title} />
      <Rich as="p" className="lead" text={card.body} />
      <div className="example">
        {card.example}
        <small>With a carry: {card.example2}</small>
      </div>
    </div>
  );
}
