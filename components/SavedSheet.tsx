"use client";

import { CATS } from "@/lib/constants";
import { byId } from "@/lib/deck";
import type { Card } from "@/types/card";

function titleOf(c: Card): string {
  switch (c.type) {
    case "quiz":
      return c.q;
    case "tf":
      return c.statement;
    case "news":
      return c.headline;
    case "fact":
    case "explainer":
    case "tip":
    case "trick":
      return c.title;
    default:
      return "Math sprint";
  }
}

export function SavedSheet({
  saved,
  email,
  onClose,
  onSignOut,
}: {
  saved: string[];
  /** Signed-in address, or null when the profile is device-only. */
  email: string | null;
  onClose: () => void;
  onSignOut: () => void;
}) {
  const cards = saved
    .map((id) => byId(id))
    .filter((c): c is Card => Boolean(c));

  return (
    <div className="sheet" role="dialog" aria-label="Saved cards">
      <h3>Saved cards</h3>
      <ul>
        {cards.length ? (
          cards.map((c) => (
            <li key={c.id}>
              <span>{CATS[c.cat]}</span>
              {titleOf(c)}
            </li>
          ))
        ) : (
          <li className="empty">Tap the bookmark on any card to keep it here.</li>
        )}
      </ul>

      <div className="account">
        {email ? (
          <>
            <p className="source">Signed in as {email}</p>
            <button className="btn ghost" onClick={onSignOut}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <p className="source">
              Your progress is saved on this device only.
            </p>
            <a className="btn" href="/signin">
              Sign in to sync
            </a>
          </>
        )}
      </div>

      <button className="btn ghost close" onClick={onClose}>
        Close
      </button>
    </div>
  );
}
