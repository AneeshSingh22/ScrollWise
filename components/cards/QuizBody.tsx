"use client";

import { useState } from "react";
import type { QuizCard, TfCard } from "@/types/card";

type AnswerState = { picked: number | null; answered: boolean };

/**
 * Quiz and true/false share all behavior — tap an option, the right one turns
 * green, a wrong pick turns red, the rest dim, and `why` reveals. The only
 * difference is 4 stacked options vs 2 side by side.
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

  return (
    <div className={`body${answered ? " answered" : ""}`}>
      <h2 className="q">{card.q}</h2>
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
      {answered && (
        <p className="why" dangerouslySetInnerHTML={{ __html: card.why }} />
      )}
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
      <h2 className="q">{card.statement}</h2>
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
      {answered && (
        <p className="why" dangerouslySetInnerHTML={{ __html: card.why }} />
      )}
    </div>
  );
}
