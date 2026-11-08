import raw from "@/data/glossary.json";

/**
 * Plain-English meanings for every abbreviation and technical term the
 * content uses (data/glossary.json). The app underlines these words in cards
 * so a tap shows what they mean, and each lesson opens with a "Key words"
 * card built from the terms it uses.
 */

export type GlossaryEntry = {
  term: string;
  /** What an abbreviation stands for. */
  full?: string;
  means: string;
  /** Other spellings and plurals that should match too. */
  aka?: string[];
  /** Too common to underline (e.g. "AI"); still looked up by name. */
  skip?: boolean;
};

export const GLOSSARY: GlossaryEntry[] = raw as GlossaryEntry[];

/** An abbreviation: no lowercase letters (GPU, FP16, 5G). Matched case-sensitively. */
function isAcronym(s: string): boolean {
  return !/[a-z]/.test(s);
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type Form = { text: string; entry: GlossaryEntry };

const forms: Form[] = GLOSSARY.filter((e) => !e.skip)
  .flatMap((e) => [e.term, ...(e.aka ?? [])].map((text) => ({ text, entry: e })))
  // Longest first, so "neural network" wins over "network" and "KV cache" over "KV".
  .sort((a, b) => b.text.length - a.text.length);

const byExact = new Map<string, GlossaryEntry>();
const byLower = new Map<string, GlossaryEntry>();
for (const f of forms) {
  if (isAcronym(f.text)) byExact.set(f.text, f.entry);
  else byLower.set(f.text.toLowerCase(), f.entry);
}

// One regex for everything. Word boundaries are hand-rolled so terms with
// digits or hyphens ("FP16", "fine-tuning") still match cleanly.
const PATTERN = new RegExp(
  `(?<!\\w)(${forms.map((f) => escape(f.text)).join("|")})(?![\\w-])`,
  "gi",
);

export type Segment = string | { text: string; entry: GlossaryEntry };

/**
 * Splits plain text into strings and glossary hits. `seen` (by term) limits
 * each term to its first appearance, so a card isn't a wall of underlines.
 */
export function segment(text: string, seen: Set<string> = new Set()): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(PATTERN)) {
    const word = m[0];
    // Case rule: an acronym only matches in capitals ("IP", not "ip").
    const entry = byExact.get(word) ?? (isAcronym(word) ? undefined : byLower.get(word.toLowerCase()));
    if (!entry) continue;
    if (seen.has(entry.term)) continue;
    seen.add(entry.term);
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    out.push({ text: word, entry });
    last = at + word.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Every glossary entry used in some texts, in order of first appearance. */
export function termsIn(texts: string[]): GlossaryEntry[] {
  const seen = new Set<string>();
  const found: GlossaryEntry[] = [];
  for (const t of texts) {
    for (const s of segment(t.replace(/<[^>]+>/g, " "), seen)) {
      if (typeof s !== "string") found.push(s.entry);
    }
  }
  return found;
}

/** Looks a term up by its name or any spelling. */
export function lookup(term: string): GlossaryEntry | undefined {
  const t = term.toLowerCase();
  return GLOSSARY.find((e) => [e.term, ...(e.aka ?? [])].some((f) => f.toLowerCase() === t));
}

/**
 * Abbreviations in a text that the glossary doesn't explain. The content check
 * fails on these, so new lessons can't slip in unexplained jargon.
 */
const NOT_JARGON = new Set([
  // Everyday abbreviations and names, plus words written in capitals for emphasis.
  "US", "UK", "USA", "OK", "TV", "PC", "ID", "AM", "PM", "CEO", "COVID", "WWII", "II", "BC",
  "AT", "OG", "ROME", "TAKE", "IT", "DOWN", "AND", "OR", "NOT", "LIKE", "WHERE", "CA",
]);
/** Every spelling the glossary knows, including "skip" entries like "AI". */
const KNOWN = new Set(GLOSSARY.flatMap((e) => [e.term, ...(e.aka ?? [])]));

export function unknownAbbreviations(text: string): string[] {
  const plain = text.replace(/<[^>]+>/g, " ");
  const out = new Set<string>();
  for (const m of plain.matchAll(/(?<![\w-])([A-Z][A-Z0-9]+)(s?)(?![\w-])/g)) {
    const word = m[1];
    if (NOT_JARGON.has(word) || NOT_JARGON.has(m[0])) continue;
    if (KNOWN.has(word) || KNOWN.has(m[0])) continue;
    out.add(word);
  }
  return [...out];
}
