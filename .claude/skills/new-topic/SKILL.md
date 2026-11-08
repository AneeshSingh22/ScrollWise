---
name: new-topic
description: Create a new Scrollwise learning topic — interactive lessons of explainers, quizzes, true/false and facts — from a one-line request, check it, and publish it to the live app. Use when the user asks for a new topic, lesson set or course on any subject ("/new-topic Quantum computing", "make me lessons on the French Revolution"), or asks to change, extend or fix an existing custom topic.
argument-hint: <topic> [notes, e.g. "beginner", "6 lessons", "focus on X"]
---

# /new-topic — make a Scrollwise topic and put it live

The user is usually on their **phone**, in a cloud session started from the
app's "Make it with Claude" button. They want the topic live in the app with
as little back-and-forth as possible. Don't ask clarifying questions unless the
request is truly ambiguous (e.g. "Mercury" — planet or element?). Pick sensible
defaults and go.

Request: **$ARGUMENTS**

## 1. Set up and look around

1. If `node_modules` is missing, run `npm ci`.
2. List `data/topics/` and skim `data/curriculum/` day topics (`"topic"` field).
   - If a custom topic on this subject already exists, **extend or revise it**
     instead of creating a duplicate — unless the user clearly wants a new one.
   - If the 30-day AI course already covers it, make the new topic go deeper or
     come at it from a different angle, and say so in the blurb.
3. Read `data/curriculum/day-06.json` as the reference example of tone,
   depth and format (step-by-step explainers with analogies, pictures, hints).

## 2. Plan the topic

- **Slug**: lowercase-with-dashes, e.g. `quantum-computing`. The file is
  `data/topics/<slug>.json`.
- **Lessons**: 4 by default (the user may ask for 1–8). Build a progression:
  1. The core idea and why it matters
  2. How it actually works (the mechanism)
  3. Applications, examples, numbers
  4. Limits, misconceptions, open questions, where it's heading
- **Category** (`cat`) — picks the card color:
  `ai` (AI), `tech` (how technology works, engineering, computing),
  `world` (science, geography, history, society), `life` (skills, health,
  money, psychology), `math` (math, logic, statistics).
- **Level**: smart, curious adult who is meeting the subject **for the first
  time**. Explain from scratch — never assume they know a term — then get
  properly deep. The user's main complaint about old lessons: "just 2
  sentences then Next", and jargon they'd never heard of in the questions.

## 3. Write the file

```json
{
  "slug": "quantum-computing",
  "topic": "Quantum computing",
  "cat": "tech",
  "blurb": "One sentence on what you'll learn (under 25 words).",
  "created": "YYYY-MM-DD (today)",
  "lessons": [
    { "title": "Lesson title", "cards": [ /* 6 cards */ ] }
  ]
}
```

Card types and their exact fields:

| type | fields |
|---|---|
| `explainer` | `title`, `steps` (4–6 × `{ "h", "p", "analogy"?, "visual"? }`), optional `aside` |
| `quiz` | `q`, `options` (exactly 4), `answer` (index 0–3), `why`, optional `hint`, `visual` |
| `tf` | `statement`, `answer` (true/false), `why`, optional `hint`, `visual` |
| `fact` | `title` (the surprising fact), `detail` (why it's true), optional `visual` |
| `tip` | `title`, `body`, `challenge` (one concrete thing to try today) |
| `trick` | `title`, `body`, `example`, `example2` (for mental-math style tricks) |

**Each lesson: 7 cards.** Open with an `explainer` of **4–6 steps** that builds
the idea from zero, one small step at a time. Then mix: at least 3 questions
(`quiz`/`tf`), a `fact`, and 3+ different types overall. End the topic's last
lesson with a `tip` when there's a natural real-world action.

**Make it visual and concrete** (this is what makes lessons not boring):
- Give **most explainer steps** an `analogy` ("Think of it like this" box) —
  an everyday comparison: a chef fetching ingredients, rounding prices…
- Give **at least 2 steps per explainer** a `visual`, and add one to some
  facts and quiz explanations. Visuals are drawn by the app from data:

```json
{ "kind": "flow", "items": ["Step one", "Step two", "Step three"], "caption": "optional" }
{ "kind": "bars", "items": [{ "label": "A", "value": 41, "note": "41%" }, { "label": "B", "value": 22 }], "unit": "GB" }
{ "kind": "compare", "left": { "title": "Before", "points": ["…"] }, "right": { "title": "After", "points": ["…"] } }
{ "kind": "cells", "items": ["0", "1", "1"], "labels": ["off", "on", "on"] }
{ "kind": "picture", "icons": "🌐 🕷️ 📄📄📄", "caption": "required for pictures" }
{ "kind": "line", "points": [[1, 5], [2, 4], [3, 3.2]], "x": "Compute", "y": "Loss" }
```
  flow 2–6 items, bars 2–6, compare 1–4 points a side, cells ≤ 12 (≤ 14
  chars each), line 2–12 points. Labels ≤ 60 chars. If numbers in a chart
  are illustrative, say "Illustration" in the caption.
- Give most questions a `hint` that points at the explainer without giving
  the answer away ("Look at the bar chart in step 2").
- Questions should be answerable by someone who just read this lesson.

**Jargon:** every abbreviation (any ALL-CAPS word like GPU, QAM) must have an
entry in `data/glossary.json` — `npm run content` fails otherwise. Add missing
ones as `{ "term": "QAM", "full": "Quadrature Amplitude Modulation", "means": "plain-English meaning, ≤ 30 words" }`
(use `"aka": [...]` for plurals/spellings). Add important technical words too
(not just abbreviations). The app underlines glossary words so a tap shows
the meaning, and opens each lesson with a "Key words" card built from them.

**Writing rules** (the checker enforces the word limits — don't fight it):
- `why`: ≤ 70 words. Open with a bold verdict: `"<b>About 64.</b> …"`; for
  true/false, `"<b>False.</b> …"` / `"<b>True.</b> …"` matching `answer`.
  Teach the reason, don't just restate the answer.
- Explainer step text ≤ 60 words, analogy ≤ 40, hint ≤ 25. Fact title ≤ 25,
  detail ≤ 60. Tip body ≤ 50. Options ≤ 20 words each. Questions ≤ 35 words.
- Only `<b>` and `<i>` markup, and only in `why`.
- Distractors must be plausible to a non-expert but clearly wrong to someone
  who read the explainer. No "all of the above", no joke options.
- Don't worry which slot the right answer is in — the app shuffles options.
- Plain words. Define jargon the first time it appears.
- **Never copy text from articles or pages.** Rewrite in your own words. If a
  card relies on one specific source (a study, a report), add
  `"source": "Short name, year"` and, if you have it, `"source_url": "https://…"`.

## 4. Checker pass — do this, it's the important part

Re-read **every** card as a skeptical expert fact-checker, separately from
writing it:
- Is the marked answer definitely correct? Is every distractor definitely wrong?
- Is every number, date and name right? If you aren't confident, soften it
  ("about", "roughly", "in the 2010s"), replace it with something you're sure
  of, or delete the card and write another.
- Would a true/false statement be true under some reasonable reading? Reword it.
- No recent "latest model / record / price" claims that may have changed.

Fix problems in the file before continuing.

## 5. Validate

```bash
npm run content     # schema + rule checks; prints every problem
npm test            # 100+ tests incl. topic structure
npm run typecheck
```

All three must pass. `npm run content` messages name the file, lesson, card
and rule — fix and re-run until it prints "✓ Content OK".

## 6. Publish

```bash
git add data/topics data/glossary.json lib/topics-data.ts
git commit -m "Add topic: <Topic name>"     # or "Update topic: …"
git push origin HEAD:main
```

Vercel deploys `main` to https://scroll-wise-sage.vercel.app in about a minute.

If the push to `main` is rejected, push the current branch instead, open a
pull request, and tell the user to tap **Merge** on it (that's what makes it
go live).

## 7. Reply (short — they're on a phone)

```
✅ "<Topic>" is live in ~1 minute.
4 lessons · 28 cards
1. …  2. …  3. …  4. …
Open Scrollwise → Learn → Your topics. (Pull down to refresh if it's not there yet.)
```

## Changing an existing topic

Same file, same rules: edit `data/topics/<slug>.json`, keep lesson order
stable where possible (finished-lesson ticks are keyed by position:
`t-<slug>-l1`, `-l2`…), run the checker pass and step 5, then publish with
"Update topic: …".
