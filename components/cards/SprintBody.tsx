"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SPRINT_MS } from "@/lib/constants";
import { makeProblem, type Problem } from "@/lib/procedural/math";

type Phase = "idle" | "running" | "done";

/**
 * 45-second mental math sprint with an on-screen keypad. Matches the
 * prototype: correct answers flash green and advance, wrong answers shake and
 * clear the entry, the bar drains left to right.
 */
export function SprintBody({ onCorrect }: { onCorrect: () => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [problem, setProblem] = useState<Problem | null>(null);
  const [entry, setEntry] = useState("");
  const [score, setScore] = useState(0);
  const [remaining, setRemaining] = useState(SPRINT_MS);
  const [flash, setFlash] = useState<"ok" | "no" | null>(null);

  const endAt = useRef(0);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback(() => {
    endAt.current = Date.now() + SPRINT_MS;
    setPhase("running");
    setProblem(makeProblem());
    setEntry("");
    setScore(0);
    setRemaining(SPRINT_MS);
    setFlash(null);
  }, []);

  // Countdown. Ticks at the prototype's 250ms so the bar transition is smooth.
  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => {
      const left = Math.max(0, endAt.current - Date.now());
      setRemaining(left);
      if (left === 0) setPhase("done");
    }, 250);
    return () => clearInterval(id);
  }, [phase]);

  // A pending "advance to next problem" timer must not outlive the component.
  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    [],
  );

  function press(k: string) {
    if (phase !== "running" || !problem) return;

    if (k === "del") {
      setEntry((e) => e.slice(0, -1));
      return;
    }

    if (k === "go") {
      if (!entry) return;
      if (Number(entry) === problem.answer) {
        setScore((s) => s + 1);
        setFlash("ok");
        onCorrect();
        advanceTimer.current = setTimeout(() => {
          setFlash(null);
          setProblem(makeProblem());
          setEntry("");
        }, 220);
      } else {
        // Re-trigger the shake even on repeated wrong answers.
        setFlash(null);
        requestAnimationFrame(() => setFlash("no"));
        setEntry("");
      }
      return;
    }

    setEntry((e) => (e.length < 5 ? e + k : e));
  }

  if (phase === "idle") {
    return (
      <div className="body">
        <h2 className="big">45-second math sprint</h2>
        <p className="lead">
          Addition, ×11, percentages, and times tables. How many can you get?
        </p>
        <button className="btn start" onClick={start}>
          Start sprint
        </button>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="body">
        <h2 className="big">45-second math sprint</h2>
        <p className="lead">
          Addition, ×11, percentages, and times tables. How many can you get?
        </p>
        <div className="sprint">
          <p className="big">{score} correct</p>
          <p className="lead">
            {score >= 10
              ? "Fast. Try to beat it tomorrow."
              : "Do this daily and watch the number climb."}
          </p>
          <button className="btn again" onClick={start}>
            Go again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="body">
      <h2 className="big">45-second math sprint</h2>
      <p className="lead">
        Addition, ×11, percentages, and times tables. How many can you get?
      </p>
      <div className="sprint">
        <div className="timer">
          <i style={{ transform: `scaleX(${remaining / SPRINT_MS})` }} />
        </div>
        <div className={`problem${flash ? ` ${flash}` : ""}`}>
          <span className="expr">{problem?.expr}</span>
          <span>=</span>
          <span className="entry">{entry || " "}</span>
        </div>
        <div className="score">{score} correct</div>
        <div className="keys">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button key={n} onClick={() => press(String(n))}>
              {n}
            </button>
          ))}
          <button aria-label="Delete" onClick={() => press("del")}>
            ⌫
          </button>
          <button onClick={() => press("0")}>0</button>
          <button className="go" aria-label="Submit" onClick={() => press("go")}>
            ✓
          </button>
        </div>
      </div>
    </div>
  );
}
