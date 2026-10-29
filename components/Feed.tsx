"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CATS, XP, type Filter } from "@/lib/constants";
import { baseId, buildSession } from "@/lib/deck";
import { applyStreak, read, write, EMPTY, type Persisted } from "@/lib/store";
import type { Card } from "@/types/card";
import { CardView, type CardCallbacks } from "./CardView";
import { Header } from "./Header";
import { SavedSheet } from "./SavedSheet";
import type { SessionStats } from "./cards/SummaryBody";

type Float = { id: number; amount: number; left: number; top: number };

const EMPTY_STATS: SessionStats = { seen: 0, answered: 0, correct: 0, xp: 0 };

export function Feed() {
  // Persisted profile. Starts from EMPTY so the server and first client render
  // agree; the stored values load in an effect right after mount.
  const [state, setState] = useState<Persisted>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  const [filter, setFilter] = useState<Filter>("all");
  const [cards, setCards] = useState<Card[]>(() => buildSession("all", [], true));
  const [stats, setStats] = useState<SessionStats>(EMPTY_STATS);
  const [progress, setProgress] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [floats, setFloats] = useState<Float[]>([]);

  const feedRef = useRef<HTMLElement | null>(null);
  const xpPillRef = useRef<HTMLSpanElement | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const floatId = useRef(0);

  /** Cards already counted toward "seen" this session, and reviews queued. */
  const seenIds = useRef<Set<string>>(new Set());
  const queuedReviews = useRef<Set<string>>(new Set());
  const currentIndex = useRef(0);

  // --- load persisted state + roll the streak over -------------------------
  useEffect(() => {
    const loaded = applyStreak(read());
    setState(loaded);
    write(loaded);
    setHydrated(true);
  }, []);

  const persist = useCallback((next: Persisted) => {
    setState(next);
    write(next);
  }, []);

  // --- card height: snap points must be exactly the viewport's feed area ---
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    const size = () => el.style.setProperty("--card-h", `${el.clientHeight}px`);
    size();
    // visualViewport catches the iOS toolbar collapsing, which resize misses.
    window.addEventListener("resize", size);
    window.visualViewport?.addEventListener("resize", size);
    return () => {
      window.removeEventListener("resize", size);
      window.visualViewport?.removeEventListener("resize", size);
    };
  }, []);

  // --- progress bar + "seen" tracking via IntersectionObserver -------------
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const children = Array.from(el.children) as HTMLElement[];
          const i = children.indexOf(e.target as HTMLElement);
          if (i < 0) continue;
          currentIndex.current = i;
          setProgress(children.length ? ((i + 1) / children.length) * 100 : 0);

          const id = (e.target as HTMLElement).dataset.id;
          if (id && id !== "intro" && id !== "summary" && !seenIds.current.has(id)) {
            seenIds.current.add(id);
            setStats((s) => ({ ...s, seen: seenIds.current.size }));
          }
        }
      },
      { root: el, threshold: 0.6 },
    );

    for (const child of Array.from(el.children)) io.observe(child);
    return () => io.disconnect();
  }, [cards]);

  // --- toast ---------------------------------------------------------------
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  // --- XP ------------------------------------------------------------------
  const addXP = useCallback(
    (amount: number) => {
      setState((prev) => {
        const next = { ...prev, xp: prev.xp + amount };
        write(next);
        return next;
      });
      setStats((s) => ({ ...s, xp: s.xp + amount }));

      // Float rises from under the XP pill, as in the prototype.
      const rect = xpPillRef.current?.getBoundingClientRect();
      if (rect) {
        const id = ++floatId.current;
        setFloats((f) => [
          ...f,
          { id, amount, left: rect.left + 6, top: rect.bottom + 4 },
        ]);
        setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 900);
      }
    },
    [],
  );

  // --- session building ----------------------------------------------------
  const rebuild = useCallback(
    (nextFilter: Filter, fewer: string[], withIntro: boolean) => {
      seenIds.current = new Set();
      queuedReviews.current = new Set();
      currentIndex.current = 0;
      setStats(EMPTY_STATS);
      setCards(buildSession(nextFilter, fewer, withIntro));
      setProgress(0);
      feedRef.current?.scrollTo({ top: 0 });
    },
    [],
  );

  const onFilter = useCallback(
    (f: Filter) => {
      setFilter(f);
      rebuild(f, state.fewer, false);
    },
    [rebuild, state.fewer],
  );

  // --- review queue: a missed card comes back 4 cards later ----------------
  const queueReview = useCallback((card: Card) => {
    const base = baseId(card.id);
    if (card.review || queuedReviews.current.has(base)) return;
    queuedReviews.current.add(base);

    const clone = { ...card, id: `${base}-r`, review: true } as Card;
    setCards((prev) => {
      const at = Math.min(currentIndex.current + 4, prev.length - 1);
      const next = [...prev];
      next.splice(at, 0, clone);
      return next;
    });
  }, []);

  // --- card callbacks ------------------------------------------------------
  const cb: CardCallbacks = useMemo(
    () => ({
      onAnswer: (card, correct) => {
        setStats((s) => ({
          ...s,
          answered: s.answered + 1,
          correct: s.correct + (correct ? 1 : 0),
        }));
        if (correct) {
          addXP(card.review ? XP.reviewCorrect : XP.quizCorrect);
        } else {
          addXP(XP.quizWrong);
          queueReview(card);
        }
      },
      onReveal: () => addXP(XP.reveal),
      onExplainerDone: () => addXP(XP.explainerDone),
      onChallengeAccepted: () => addXP(XP.challengeAccepted),
      onSprintCorrect: () => addXP(XP.sprintCorrect),
      onLike: (card, on) => {
        const base = baseId(card.id);
        setState((prev) => {
          const liked = prev.liked.filter((x) => x !== base);
          if (on) liked.push(base);
          const next = { ...prev, liked };
          write(next);
          return next;
        });
      },
      onSave: (card) => {
        const base = baseId(card.id);
        setState((prev) => {
          const on = !prev.saved.includes(base);
          const saved = prev.saved.filter((x) => x !== base);
          if (on) saved.push(base);
          const next = { ...prev, saved };
          write(next);
          showToast(on ? "Saved" : "Removed from saved");
          return next;
        });
      },
      onFewer: (card) => {
        setState((prev) => {
          if (prev.fewer.includes(card.cat)) return prev;
          const next = { ...prev, fewer: [...prev.fewer, card.cat] };
          write(next);
          return next;
        });
        showToast(`You'll see fewer ${CATS[card.cat]} cards next round.`);
      },
      onAnother: () => rebuild(filter, state.fewer, false),
    }),
    [addXP, queueReview, rebuild, showToast, filter, state.fewer],
  );

  return (
    <>
      <div className="app">
        <Header
          xp={state.xp}
          streak={state.streak}
          savedCount={state.saved.length}
          filter={filter}
          progress={progress}
          onFilter={onFilter}
          onOpenSaved={() => setSheetOpen(true)}
          xpPillRef={xpPillRef}
        />
        <main className="feed" aria-label="Learning feed" ref={feedRef}>
          {cards.map((card) => (
            <CardView
              key={card.id}
              card={card}
              liked={hydrated && state.liked.includes(baseId(card.id))}
              saved={hydrated && state.saved.includes(baseId(card.id))}
              stats={stats}
              cb={cb}
            />
          ))}
        </main>
      </div>

      {sheetOpen && (
        <SavedSheet saved={state.saved} onClose={() => setSheetOpen(false)} />
      )}
      {toast && <div className="toast">{toast}</div>}
      {floats.map((f) => (
        <div key={f.id} className="float-xp" style={{ left: f.left, top: f.top }}>
          +{f.amount}
        </div>
      ))}
    </>
  );
}
