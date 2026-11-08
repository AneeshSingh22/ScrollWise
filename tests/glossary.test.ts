import { describe, expect, it } from "vitest";
import { GLOSSARY, lookup, segment, termsIn, unknownAbbreviations } from "@/lib/glossary";
import { buildLesson, keyWordsCard, MAX_KEY_WORDS } from "@/lib/curriculum";

const hits = (text: string) =>
  segment(text)
    .filter((s) => typeof s !== "string")
    .map((s) => (s as { text: string }).text);

describe("glossary", () => {
  it("has one entry per term, each with a meaning", () => {
    const names = GLOSSARY.map((e) => e.term.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    for (const e of GLOSSARY) expect(e.means.length, e.term).toBeGreaterThan(10);
  });

  it("finds abbreviations, plurals and phrases", () => {
    expect(hits("GPUs beat a CPU at matrix maths")).toEqual(["GPUs", "CPU", "matrix"]);
    expect(hits("A neural network has layers")).toEqual(["neural network", "layers"]);
  });

  it("matches abbreviations only in capitals", () => {
    expect(hits("ip and Ip")).toEqual([]);
    expect(hits("your IP address")).toEqual(["IP"]);
  });

  it("does not match inside longer words", () => {
    expect(hits("fabulous bitter")).toEqual([]);
  });

  it("underlines each term once per text and keeps the rest intact", () => {
    const segs = segment("A token, then another token.");
    expect(segs.filter((s) => typeof s !== "string")).toHaveLength(1);
    expect(segs.map((s) => (typeof s === "string" ? s : s.text)).join("")).toBe("A token, then another token.");
  });

  it("skips entries marked too common to underline but still knows them", () => {
    expect(hits("AI is everywhere")).toEqual([]);
    expect(lookup("AI")?.full).toBe("Artificial Intelligence");
    expect(unknownAbbreviations("AI and the EU")).toEqual([]);
  });

  it("reports unexplained abbreviations, ignoring markup", () => {
    expect(unknownAbbreviations("<b>The QQZ.</b> Uses a GPU.")).toEqual(["QQZ"]);
  });

  it("lists terms in order of first appearance", () => {
    expect(termsIn(["A GPU and a token", "another GPU"]).map((t) => t.term)).toEqual(["GPU", "token"]);
  });
});

describe("key words card", () => {
  it("opens a lesson with at most MAX_KEY_WORDS terms", () => {
    const first = buildLesson("d06-l1")[0];
    expect(first.type).toBe("terms");
    if (first.type === "terms") {
      expect(first.terms.length).toBeGreaterThanOrEqual(2);
      expect(first.terms.length).toBeLessThanOrEqual(MAX_KEY_WORDS);
    }
  });

  it("is left out when a lesson uses almost no jargon", () => {
    expect(keyWordsCard("x", [{ id: "a", cat: "life", type: "fact", title: "Sleep helps.", detail: "Rest well." }], "life")).toBeNull();
  });
});

describe("glossary edge cases", () => {
  it("matches a term after a hyphen, as in 128-bit", () => {
    expect(hits("a 128-bit hash")).toEqual(["bit", "hash"]);
  });
});
