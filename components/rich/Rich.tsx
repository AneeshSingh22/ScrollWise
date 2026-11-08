"use client";

import { createContext, Fragment, useContext, type ReactNode } from "react";
import { segment, type GlossaryEntry } from "@/lib/glossary";

/**
 * Text with tappable jargon. Any word in data/glossary.json gets a dotted
 * underline; tapping it opens a short plain-English definition (the term
 * sheet in Feed). Supports the <b>/<i> markup used in explanations.
 */

type Gloss = { open: (e: GlossaryEntry) => void };

export const GlossContext = createContext<Gloss | null>(null);

export function Rich({ text, as: Tag = "span", className }: { text: string; as?: "span" | "p" | "h2" | "h3"; className?: string }) {
  const gloss = useContext(GlossContext);
  return <Tag className={className}>{render(text, gloss)}</Tag>;
}

/** Splits on <b>/<i> tags and glosses the text between them. */
function render(html: string, gloss: Gloss | null): ReactNode[] {
  const out: ReactNode[] = [];
  const seen = new Set<string>();
  let bold = false;
  let italic = false;
  let k = 0;
  for (const part of html.split(/(<\/?[bi]>)/)) {
    if (part === "<b>") bold = true;
    else if (part === "</b>") bold = false;
    else if (part === "<i>") italic = true;
    else if (part === "</i>") italic = false;
    else if (part) {
      let node: ReactNode = segment(part, seen).map((s, i) =>
        typeof s === "string" ? (
          <Fragment key={i}>{s}</Fragment>
        ) : gloss ? (
          <button
            key={i}
            type="button"
            className="term"
            onClick={(e) => {
              e.stopPropagation();
              gloss.open(s.entry);
            }}
          >
            {s.text}
          </button>
        ) : (
          <Fragment key={i}>{s.text}</Fragment>
        ),
      );
      if (italic) node = <i>{node}</i>;
      if (bold) node = <b>{node}</b>;
      out.push(<Fragment key={k++}>{node}</Fragment>);
    }
  }
  return out;
}

/** Chips for terms that appear where they can't be underlined (inside answer buttons). */
export function TermChips({ label, terms }: { label: string; terms: GlossaryEntry[] }) {
  const gloss = useContext(GlossContext);
  if (!gloss || terms.length === 0) return null;
  return (
    <div className="term-chips">
      <span>{label}</span>
      {terms.map((t) => (
        <button key={t.term} type="button" className="term-chip" onClick={() => gloss.open(t)}>
          {t.term}
        </button>
      ))}
    </div>
  );
}

/** The bottom sheet that explains one term. */
export function TermSheet({ entry, onClose }: { entry: GlossaryEntry; onClose: () => void }) {
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet term-sheet" role="dialog" aria-label={`What ${entry.term} means`}>
        <p className="eyebrow">What it means</p>
        <h3>{entry.term}</h3>
        {entry.full && <p className="term-full">Short for: {entry.full}</p>}
        <p className="term-means">{entry.means}</p>
        <button className="btn close" onClick={onClose}>
          Got it
        </button>
      </div>
    </>
  );
}
