import type { SupabaseClient } from "@supabase/supabase-js";
import { levelFor } from "./constants";
import { applyStreak, read, write, type Persisted } from "./store";

/**
 * The profile layer. Signed out, everything lives in localStorage exactly as
 * in Phase 0. Signed in, Supabase is the source of truth and localStorage
 * becomes a cache, so a cold start still renders instantly.
 *
 * Local progress earned before signing in is merged, never discarded: XP and
 * streak take the larger value, and saved/liked/fewer are unioned.
 */

type ProfileRow = {
  xp: number;
  level: number;
  streak: number;
  last_active: string | null;
  topic_weights: Record<string, number>;
};

/** Reads the signed-in profile plus the user's saved card ids. */
export async function loadRemote(
  supabase: SupabaseClient,
  userId: string,
): Promise<Persisted | null> {
  const [{ data: profile, error: pErr }, { data: savedRows, error: sErr }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("xp, level, streak, last_active, topic_weights")
        .eq("id", userId)
        .maybeSingle<ProfileRow>(),
      supabase.from("saved").select("card_id").eq("user_id", userId),
    ]);

  if (pErr || sErr || !profile) return null;

  return {
    xp: profile.xp,
    streak: profile.streak,
    lastDay: profile.last_active ?? "",
    saved: (savedRows ?? []).map((r) => String(r.card_id)),
    // Not yet columns of their own; Phase 6 moves these into topic_weights.
    liked: [],
    fewer: [],
  };
}

/** Union of two id lists, order-stable and de-duplicated. */
function union(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])];
}

/**
 * Merges whatever the device earned while signed out into the remote profile.
 * Deliberately generous: a user who played offline should never lose XP.
 */
export function merge(local: Persisted, remote: Persisted): Persisted {
  return {
    xp: Math.max(local.xp, remote.xp),
    streak: Math.max(local.streak, remote.streak),
    lastDay: local.lastDay > remote.lastDay ? local.lastDay : remote.lastDay,
    saved: union(remote.saved, local.saved),
    liked: union(remote.liked, local.liked),
    fewer: union(remote.fewer, local.fewer),
  };
}

/** Writes the profile row. Saved cards are written separately as they change. */
export async function pushProfile(
  supabase: SupabaseClient,
  userId: string,
  s: Persisted,
): Promise<void> {
  await supabase.from("profiles").upsert({
    id: userId,
    xp: s.xp,
    level: levelFor(s.xp),
    streak: s.streak,
    last_active: s.lastDay || null,
  });
}

export async function pushSaved(
  supabase: SupabaseClient,
  userId: string,
  cardId: string,
  on: boolean,
): Promise<void> {
  if (on) {
    await supabase.from("saved").upsert({ user_id: userId, card_id: cardId });
  } else {
    await supabase
      .from("saved")
      .delete()
      .eq("user_id", userId)
      .eq("card_id", cardId);
  }
}

/**
 * Signs a user in on this device: pulls the remote profile, merges the local
 * one into it, writes the result back, and returns it for the UI.
 */
export async function syncOnSignIn(
  supabase: SupabaseClient,
  userId: string,
): Promise<Persisted> {
  const local = applyStreak(read());
  const remote = await loadRemote(supabase, userId);

  // No row yet (the trigger runs on signup, but be defensive).
  const merged = remote ? merge(local, remote) : local;

  await pushProfile(supabase, userId, merged);

  // Any card saved offline needs a row too.
  if (remote) {
    const toAdd = merged.saved.filter((id) => !remote.saved.includes(id));
    if (toAdd.length) {
      await supabase
        .from("saved")
        .upsert(toAdd.map((card_id) => ({ user_id: userId, card_id })));
    }
  }

  write(merged);
  return merged;
}
