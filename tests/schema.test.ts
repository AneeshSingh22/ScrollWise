import { describe, expect, it } from "vitest";
import {
  LessonCardSchema,
  lessonProblems,
  ruleProblems,
  TopicSchema,
  words,
  type LessonCardInput,
} from "@/lib/schema";

/**
 * The checker is what stands between a /new-topic run and the live app, so
 * these tests make sure it actually rejects the mistakes it claims to catch.
 */

const quiz = (over: Partial<Extract<LessonCardInput, { type: "quiz" }>> = {}): LessonCardInput => ({
  type: "quiz",
  q: "What is 2 + 2?",
  options: ["3", "4", "5", "22"],
  answer: 1,
  why: "<b>Four.</b> Adding two and two gives four.",
  ...over,
});

const tf = (answer: boolean, why: string): LessonCardInput => ({
  type: "tf",
  statement: "The sky is green.",
  answer,
  why,
});

const fact: LessonCardInput = { type: "fact", title: "A fact.", detail: "Why it is true." };
const explainer: LessonCardInput = {
  type: "explainer",
  title: "How it works",
  steps: [
    { h: "One", p: "First." },
    { h: "Two", p: "Second." },
    { h: "Three", p: "Third." },
  ],
};

describe("schemas", () => {
  it("accepts a well-formed quiz", () => {
    expect(LessonCardSchema.safeParse(quiz()).success).toBe(true);
  });

  it("rejects a quiz without exactly four options", () => {
    expect(LessonCardSchema.safeParse(quiz({ options: ["a", "b", "c"] })).success).toBe(false);
  });

  it("rejects an out-of-range answer", () => {
    expect(LessonCardSchema.safeParse(quiz({ answer: 4 })).success).toBe(false);
  });

  it("rejects UI-only card types in lessons", () => {
    expect(LessonCardSchema.safeParse({ type: "sprint" }).success).toBe(false);
    expect(LessonCardSchema.safeParse({ type: "summary" }).success).toBe(false);
  });

  it("rejects a non-https source link", () => {
    expect(LessonCardSchema.safeParse({ ...fact, source_url: "http://example.com" }).success).toBe(false);
  });

  it("requires a lowercase-dash slug and a date on topics", () => {
    const topic = {
      slug: "quantum-computing",
      topic: "Quantum",
      cat: "tech",
      blurb: "b",
      created: "2026-11-03",
      lessons: [{ title: "L", cards: [explainer, quiz(), tf(false, "<b>False.</b> It is blue."), fact] }],
    };
    expect(TopicSchema.safeParse(topic).success).toBe(true);
    expect(TopicSchema.safeParse({ ...topic, slug: "Quantum Computing" }).success).toBe(false);
    expect(TopicSchema.safeParse({ ...topic, created: "today" }).success).toBe(false);
  });
});

describe("rule checks", () => {
  it("passes a good quiz", () => {
    expect(ruleProblems(quiz())).toEqual([]);
  });

  it("flags an explanation over 45 words", () => {
    const long = `<b>Yes.</b> ${"word ".repeat(50)}`;
    expect(ruleProblems(quiz({ why: long })).join()).toMatch(/why is \d+ words/);
  });

  it("flags duplicate options, ignoring case", () => {
    expect(ruleProblems(quiz({ options: ["Four", "four", "5", "6"] })).join()).toMatch(/not all different/);
  });

  it("flags markup other than <b> and <i>", () => {
    expect(ruleProblems(quiz({ why: "<b>Four.</b> <a href='x'>link</a>" })).join()).toMatch(/HTML/);
  });

  it("checks a true/false verdict matches the answer", () => {
    expect(ruleProblems(tf(false, "<b>False.</b> It is blue."))).toEqual([]);
    expect(ruleProblems(tf(false, "<b>Mostly false.</b> Usually blue."))).toEqual([]);
    expect(ruleProblems(tf(true, "<b>False.</b> It is blue.")).join()).toMatch(/answer is true/);
    expect(ruleProblems(tf(false, "It is blue.")).join()).toMatch(/bold verdict/);
  });

  it("flags an explainer step over 35 words", () => {
    const card: LessonCardInput = {
      ...explainer,
      steps: [{ h: "Long", p: "word ".repeat(40) }, ...explainer.steps.slice(1)],
    } as LessonCardInput;
    expect(ruleProblems(card).join()).toMatch(/step 1 is 40 words/);
  });

  it("requires two questions and three card types per lesson", () => {
    expect(lessonProblems([explainer, quiz(), fact, fact]).join()).toMatch(/only 1 question/);
    expect(lessonProblems([quiz(), quiz(), quiz(), quiz()]).join()).toMatch(/3 different card types/);
    expect(lessonProblems([explainer, quiz(), tf(false, "<b>False.</b> Blue."), fact])).toEqual([]);
  });

  it("counts words without markup", () => {
    expect(words("<b>Two words.</b> three")).toBe(3);
  });
});
