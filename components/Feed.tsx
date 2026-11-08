"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CATS, XP, type Filter } from "@/lib/constants";
import { buildLesson, dayByNumber, dayProgress, todayDayNumber } from "@/lib/curriculum";
import { useUpdateAvailable } from "@/lib/useUpdateAvailable";
import { baseId, buildSession } from "@/lib/deck";
import { useProfile } from "@/lib/useProfile";
import type { Card, IntroCard } from "@/types/card";
import { CardView, type CardCallbacks, type LearnContext } from "./CardView";
import { Header } from "./Header";
import { SavedSheet } from "./SavedSheet";
import { GlossContext, TermSheet } from "./rich/Rich";
import type { GlossaryEntry } from "@/lib/glossary";
import type { SessionStats } from "./cards/SummaryBody";

type Float = { id: number; amount: number; left: number; top: number };

/**
 * What the screen is showing:
 * - course: the course screen (one card listing a day's lessons and all days)
 * - lesson: a running lesson's cards, closed by the end-of-lesson card
 * - feed:   the open-ended scroll feed for a topic chip
 */
type Mode =
  | { kind: "course"; unit: string | null }
  | { kind: "lesson"; id: string }
  | { kind: "feed" };

const EMPTY_STATS: SessionStats = { seen: 0, answered: 0, correct: 0, xp: 0 };

/** The course screen is rendered in the intro card's slot. */
const COURSE_CARD: IntroCard = { id: "course", cat: "intro", type: "intro" };

/** Cards that are UI chrome, not content: never counted as seen. */
function isChromeId(id: string): boolean {
  return id === "intro" || id === "course" || id.startsWith("summary") || id.startsWith("terms-");
}

export function Feed() {
  // Profile: localStorage when signed out, mirrored to Supabase when signed in.
  const {
    state,
    user,
    hydrated,
    addXP: persistXP,
    toggleSave,
    setLiked,
    addFewer,
    completeLesson,
    markSeen,
    signOut,
  } = useProfile();

  const [filter, setFilter] = useState<Filter>("all");
  const [mode, setMode] = useState<Mode>({ kind: "course", unit: null });
  // A newer deploy (e.g. a topic just added with /new-topic) is live.
  const updateAvailable = useUpdateAvailable();
  // Today's course day depends on the local date, so it is only known on the
  // client — computing it during the static server render would bake in the
  // build date and mismatch on hydration.
  const [today, setToday] = useState<number | null>(null);
  const [cards, setCards] = useState<Card[]>(() => [COURSE_CARD]);
  const [stats, setStats] = useState<SessionStats>(EMPTY_STATS);
  const [progress, setProgress] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [floats, setFloats] = useState<Float[]>([]);
  // The glossary term being explained, if any.
  const [term, setTerm] = useState<GlossaryEntry | null>(null);
  const gloss = useMemo(() => ({ open: setTerm }), []);

  const feedRef = useRef<HTMLElement | null>(null);
  const xpPillRef = useRef<HTMLSpanElement | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const floatId = useRef(0);

  /** Cards already counted toward "seen" this session, and reviews queued. */
  const seenIds = useRef<Set<string>>(new Set());
  const queuedReviews = useRef<Set<string>>(new Set());
  const currentIndex = useRef(0);

  // Latest mode and markSeen for the IntersectionObserver callback.
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const markSeenRef = useRef(markSeen);
  markSeenRef.current = markSeen;

  // --- today's course day (local time; re-checked when the app returns) ----
  useEffect(() => {
    const update = () => setToday(todayDayNumber());
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
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
          if (id && !isChromeId(id) && !seenIds.current.has(id)) {
            seenIds.current.add(id);
            setStats((s) => ({ ...s, seen: seenIds.current.size }));
            // Feed cards are remembered so later rounds prefer fresh ones.
            if (modeRef.current.kind === "feed") markSeenRef.current([baseId(id)]);
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
      persistXP(amount);
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
    [persistXP],
  );

  // --- loading a card list -------------------------------------------------
  /** Resets per-session counters and shows a new list from the top. */
  const loadCards = useCallback((next: Card[]) => {
    seenIds.current = new Set();
    queuedReviews.current = new Set();
    currentIndex.current = 0;
    setStats(EMPTY_STATS);
    setCards(next);
    setProgress(0);
    feedRef.current?.scrollTo({ top: 0 });
  }, []);

  /** A fresh scroll-feed round for a topic chip. */
  const startFeed = useCallback(
    (f: Filter, withIntro: boolean) => {
      setMode({ kind: "feed" });
      setFilter(f);
      loadCards(buildSession(f, state.fewer, withIntro, state.feedSeen));
    },
    [loadCards, state.fewer, state.feedSeen],
  );

  const onFilter = useCallback((f: Filter) => startFeed(f, false), [startFeed]);

  const onOpenCourse = useCallback(() => {
    setMode({ kind: "course", unit: null });
    loadCards([COURSE_CARD]);
  }, [loadCards]);

  const onSelectUnit = useCallback((unit: string) => {
    // The course card stays mounted; only the unit it shows changes.
    setMode({ kind: "course", unit });
  }, []);

  const onStartLesson = useCallback(
    (id: string) => {
      setMode({ kind: "lesson", id });
      loadCards(buildLesson(id));
    },
    [loadCards],
  );

  // A lesson counts as finished once its closing card is reached.
  useEffect(() => {
    if (mode.kind !== "lesson" || progress < 100) return;
    const last = cards[cards.length - 1];
    if (last?.type === "summary") completeLesson(mode.id);
  }, [mode, progress, cards, completeLesson]);

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
      onLike: (card, on) => setLiked(baseId(card.id), on),
      onSave: (card) => {
        const on = toggleSave(baseId(card.id));
        showToast(on ? "Saved" : "Removed from saved");
      },
      onFewer: (card) => {
        addFewer(card.cat);
        showToast(`You'll see fewer ${CATS[card.cat]} cards next round.`);
      },
      onAnother: () => startFeed(filter, false),
      onSelectUnit,
      onStartLesson,
      onOpenCourse,
    }),
    [
      addXP,
      queueReview,
      showToast,
      setLiked,
      toggleSave,
      addFewer,
      startFeed,
      filter,
      onSelectUnit,
      onStartLesson,
      onOpenCourse,
    ],
  );

  /** Course context for the course screen and end-of-lesson card. */
  const learn: LearnContext | undefined = useMemo(() => {
    if (mode.kind === "feed") return undefined;
    return {
      today,
      selectedUnit: mode.kind === "course" ? mode.unit : null,
      lessonId: mode.kind === "lesson" ? mode.id : null,
      done: hydrated ? state.lessonsDone : [],
    };
  }, [mode, today, hydrated, state.lessonsDone]);

  const todayDay = today ? dayByNumber(today) : undefined;

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
          learnActive={mode.kind !== "feed"}
          learnLabel={
            todayDay && hydrated
              ? `Learn ${dayProgress(todayDay, state.lessonsDone)}/${todayDay.lessons.length}`
              : "Learn"
          }
          onOpenLearn={onOpenCourse}
        />
        <GlossContext.Provider value={gloss}>
        <main className="feed" aria-label="Learning feed" ref={feedRef}>
          {cards.map((card) => (
            <CardView
              key={card.id}
              card={card}
              liked={hydrated && state.liked.includes(baseId(card.id))}
              saved={hydrated && state.saved.includes(baseId(card.id))}
              stats={stats}
              cb={cb}
              learn={learn}
            />
          ))}
        </main>
        </GlossContext.Provider>
      </div>

      {term && <TermSheet entry={term} onClose={() => setTerm(null)} />}

      {sheetOpen && (
        <SavedSheet
          saved={state.saved}
          email={user?.email ?? null}
          onClose={() => setSheetOpen(false)}
          onSignOut={() => {
            setSheetOpen(false);
            void signOut();
          }}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
      {updateAvailable && (
        <button className="toast update" onClick={() => window.location.reload()}>
          New content is live — tap to refresh
        </button>
      )}
      {floats.map((f) => (
        <div key={f.id} className="float-xp" style={{ left: f.left, top: f.top }}>
          +{f.amount}
        </div>
      ))}
    </>
  );
}
