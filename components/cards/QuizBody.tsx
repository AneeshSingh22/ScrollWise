"use client";

import { useEffect, useRef, useState } from "react";
import { termsIn } from "@/lib/glossary";
import type { QuizCard, TfCard, Visual as V } from "@/types/card";
import { Rich, TermChips } from "../rich/Rich";
import { Visual } from "../rich/Visual";
import { goToSibling } from "../rich/next";

type AnswerState = { picked: number | null; answered: boolean };

/**
 * Quiz and true/false share all behavior — tap an option, the right one turns
 * green, a wrong pick turns red, the rest dim, and `why` reveals. The only
 * difference is 4 stacked options vs 2 side by side.
 *
 * Added for learning from scratch: jargon in the question is tappable, jargon
 * inside the answers gets chips above them, an optional hint, a picture with
 * the explanation, and a Next button so moving on never depends on a swipe.
 */

export function QuizBody({
  card,
  onAnswer,
}: {
  card: QuizCard;
  onAnswer: (correct: boolean) => void;
}) {
  const [{ picked, answered }, setState] = useState<AnswerState>({
    picked: null,
    answered: false,
  });

  function pick(i: number) {
    if (answered) return;
    setState({ picked: i, answered: true });
    onAnswer(i === card.answer);
  }

  const qTerms = new Set(termsIn([card.q]).map((t) => t.term));
  const optionTerms = termsIn(card.options).filter((t) => !qTerms.has(t.term));

  return (
    <div className={`body${answered ? " answered" : ""}`}>
      <Rich as="h2" className="q" text={card.q} />
      {!answered && <Hint hint={card.hint} />}
      {!answered && <TermChips label="Words in the answers:" terms={optionTerms} />}
      <div className="opts">
        {card.options.map((o, i) => (
          <button
            key={i}
            className={`opt${answered && i === card.answer ? " right" : ""}${
              answered && i === picked && i !== card.answer ? " wrong" : ""
            }`}
            onClick={() => pick(i)}
          >
            {o}
          </button>
        ))}
      </div>
      {answered && <Explanation why={card.why} visual={card.visual} />}
    </div>
  );
}

export function TfBody({
  card,
  onAnswer,
}: {
  card: TfCard;
  onAnswer: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<boolean | null>(null);
  const answered = picked !== null;

  function pick(v: boolean) {
    if (answered) return;
    setPicked(v);
    onAnswer(v === card.answer);
  }

  return (
    <div className={`body${answered ? " answered" : ""}`}>
      <p className="eyebrow">True or false?</p>
      <Rich as="h2" className="q" text={card.statement} />
      {!answered && <Hint hint={card.hint} />}
      <div className="opts two">
        {[true, false].map((v) => (
          <button
            key={String(v)}
            className={`opt${answered && v === card.answer ? " right" : ""}${
              answered && v === picked && v !== card.answer ? " wrong" : ""
            }`}
            onClick={() => pick(v)}
          >
            {v ? "True" : "False"}
          </button>
        ))}
      </div>
      {answered && <Explanation why={card.why} visual={card.visual} />}
    </div>
  );
}

function Hint({ hint }: { hint?: string }) {
  const [shown, setShown] = useState(false);
  if (!hint) return null;
  return shown ? (
    <p className="hint">
      <span>Hint</span> <Rich text={hint} />
    </p>
  ) : (
    <button className="btn ghost small" onClick={() => setShown(true)}>
      Need a hint?
    </button>
  );
}

/** The explanation, scrolled into view, with a way to move on. */
function Explanation({ why, visual }: { why: string; visual?: V }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);
  return (
    <div className="explain" ref={ref}>
      <Rich as="p" className="why" text={why} />
      {visual && <Visual v={visual} />}
      <NextButton />
    </div>
  );
}

export function NextButton({ label = "Next" }: { label?: string }) {
  const ref = useRef<HTMLButtonElement | null>(null);
  return (
    <button ref={ref} className="btn next-card" onClick={() => goToSibling(ref.current, 1)}>
      {label} <span aria-hidden>↓</span>
    </button>
  );
}
