"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "./supabase/client";
import { EMPTY, FEED_SEEN_CAP, applyStreak, read, write, type Persisted } from "./store";
import { pushProfile, pushSaved, syncOnSignIn } from "./profile";

/**
 * One hook for the whole profile. Signed out it behaves exactly as Phase 0
 * (localStorage only). Signed in it mirrors every change to Supabase.
 *
 * Writes are optimistic: local state and localStorage update immediately so
 * the UI never waits on the network, and the remote write follows. A failed
 * write leaves the local copy intact and is retried on the next change.
 */
export function useProfile() {
  const [state, setState] = useState<Persisted>(EMPTY);
  const [user, setUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const supabaseRef = useRef<SupabaseClient | null>(null);
  function supabase(): SupabaseClient {
    supabaseRef.current ??= createClient();
    return supabaseRef.current;
  }

  // Latest state, for callbacks that must not re-create on every change.
  const latest = useRef(state);
  latest.current = state;

  // Debounce profile pushes so a burst of XP is one write, not ten.
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedulePush = useCallback((uid: string, next: Persisted) => {
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      void pushProfile(supabase(), uid, next);
    }, 1200);
  }, []);

  // --- initial load + auth changes ----------------------------------------
  useEffect(() => {
    let cancelled = false;

    // Render from localStorage immediately; the network can take its time.
    const local = applyStreak(read());
    setState(local);
    write(local);
    setHydrated(true);

    const sb = supabase();

    void sb.auth.getUser().then(async ({ data }) => {
      if (cancelled) return;
      const u = data.user ?? null;
      setUser(u);
      if (u) {
        const merged = await syncOnSignIn(sb, u.id);
        if (!cancelled) setState(merged);
      }
    });

    const { data: sub } = sb.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;
      const u = session?.user ?? null;
      setUser(u);

      if (event === "SIGNED_IN" && u) {
        const merged = await syncOnSignIn(sb, u.id);
        if (!cancelled) setState(merged);
      }
      if (event === "SIGNED_OUT") {
        // Keep local progress; the device simply stops syncing.
        setState(applyStreak(read()));
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, []);

  /** Applies a change locally, then mirrors it remotely if signed in. */
  const update = useCallback(
    (fn: (prev: Persisted) => Persisted) => {
      setState((prev) => {
        const next = fn(prev);
        write(next);
        if (user) schedulePush(user.id, next);
        return next;
      });
    },
    [user, schedulePush],
  );

  const addXP = useCallback(
    (amount: number) => update((p) => ({ ...p, xp: p.xp + amount })),
    [update],
  );

  const toggleSave = useCallback(
    (cardId: string): boolean => {
      const on = !latest.current.saved.includes(cardId);
      update((p) => ({
        ...p,
        saved: on
          ? [...p.saved.filter((x) => x !== cardId), cardId]
          : p.saved.filter((x) => x !== cardId),
      }));
      if (user) void pushSaved(supabase(), user.id, cardId, on);
      return on;
    },
    [update, user],
  );

  const setLiked = useCallback(
    (cardId: string, on: boolean) =>
      update((p) => ({
        ...p,
        liked: on
          ? [...p.liked.filter((x) => x !== cardId), cardId]
          : p.liked.filter((x) => x !== cardId),
      })),
    [update],
  );

  const addFewer = useCallback(
    (cat: string) =>
      update((p) =>
        p.fewer.includes(cat) ? p : { ...p, fewer: [...p.fewer, cat] },
      ),
    [update],
  );

  const completeLesson = useCallback(
    (lessonId: string) =>
      update((p) =>
        p.lessonsDone.includes(lessonId)
          ? p
          : { ...p, lessonsDone: [...p.lessonsDone, lessonId] },
      ),
    [update],
  );

  /** Records feed cards as seen so the next round prefers fresh ones. */
  const markSeen = useCallback(
    (ids: string[]) =>
      update((p) => {
        const fresh = ids.filter((id) => !p.feedSeen.includes(id));
        if (!fresh.length) return p;
        return { ...p, feedSeen: [...p.feedSeen, ...fresh].slice(-FEED_SEEN_CAP) };
      }),
    [update],
  );

  const signOut = useCallback(async () => {
    await supabase().auth.signOut();
  }, []);

  return {
    state,
    user,
    hydrated,
    addXP,
    toggleSave,
    setLiked,
    addFewer,
    completeLesson,
    markSeen,
    signOut,
  };
}
