# Scrollwise — Build Spec

A Reels-style vertical feed of short, interactive learning cards (AI news, how tech works, life skills, general knowledge, mental math) to replace social media scrolling when I'm bored. Installed as an iPhone home-screen PWA. Built by Claude Code, one phase at a time.

---

## 0. How to use this spec with Claude Code

The repo starts with three files: `SPEC.md` (this file), `CLAUDE.md` (standing rules), and `reference/prototype.html` (the approved look and feel). `START-HERE.md` has the exact setup steps and prompts.

**Development machine:** Windows laptop. All scripts must be cross-platform Node/TypeScript (run with `tsx`), never bash-only. Use `.env.local` for secrets. Give PowerShell commands when telling me what to run.

**LLM plan:** start with the free local model (Ollama on the Windows laptop) for Phases 0–4, 6, and 7. Phase 5 (Claude Haiku) comes later, when I decide to switch.

---

## 1. Goals

- Opening the app feels like Reels: instant, full-screen, swipe up for the next thing.
- Every card is either interactive (quiz, true/false, math, step-through explainer, challenge) or a fact short enough to read in under 10 seconds.
- I actually retain things: missed questions come back on a spaced-repetition schedule.
- Fresh content daily, especially AI and tech news, without me curating anything.
- Sessions have an end. A session is ~15 cards, then a summary screen with "Another round" or "I'm done".
- Running cost near zero.

**Topic categories** (keys used everywhere): `ai` (AI news and concepts), `tech` (how things work), `life` (speaking, productivity, habits, money basics, communication), `world` (geography, history, science), `math` (mental math).

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| App | Next.js (App Router) + TypeScript + Tailwind, PWA (manifest, icons, service worker) |
| Hosting + scheduled jobs | Vercel (Vercel Cron for nightly ingestion) |
| Auth / DB | Supabase (magic link, Postgres, row-level security). Reuse Habit Garden's setup if it already has one. |
| Dev machine | Windows laptop; Claude Code; Node.js LTS; Git |
| LLM (testing, first) | Ollama for Windows running an open-source instruct model locally (`http://localhost:11434`). Pick the model size from the laptop's RAM/GPU (see Phase 4). |
| LLM (production) | Claude Haiku 5.5 (`claude-haiku-5-5`) through the Message Batches API |
| Validation | Zod |
| Tests | Vitest |

**Environment variables**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server/scripts only, for writing cards
LLM_PROVIDER=ollama               # ollama | anthropic
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=                     # chosen in Phase 4 based on the laptop's hardware
ANTHROPIC_API_KEY=                # server only
ANTHROPIC_MODEL=claude-haiku-5-5
CRON_SECRET=                      # protects /api/cron/* routes
```

---

## 3. Architecture

```
NIGHTLY PIPELINE
  1. Ingest   → fetch raw items from free sources (section 4) → raw_items table
  2. Generate → LLM turns each raw item into 1-3 cards (strict JSON) → draft cards
  3. Check    → second LLM pass + rule checks; reject anything unsupported by the source
  4. Publish  → cards table (status = live)
  Procedural cards (math, geography) skip steps 2-3: generated in code, always correct.

APP (PWA)
  /api/session → builds a 15-card session: personalized mix + due reviews + 1 math sprint
  Card renderer → one component per card type (section 5)
  Events (view, dwell, skip, like, save, answer) → card_events → personalization + spaced repetition
```

**Where the pipeline runs depends on the provider:**
- `LLM_PROVIDER=ollama`: Vercel can't reach my laptop, so the pipeline runs as a local script (`npm run pipeline`) on my Windows laptop. It writes finished cards straight to Supabase with the service role key. The deployed app on my phone just reads cards from Supabase. A Windows Task Scheduler job runs the pipeline every morning (set up in Phase 4); if the laptop was off, I run it by hand. Keep a buffer: the session builder should still work on 3+ days of older unseen cards plus procedural cards if a run is missed.
- `LLM_PROVIDER=anthropic`: Vercel Cron runs it. Night cron (e.g. 2:00) ingests and **submits a Message Batch**. Morning cron (e.g. 6:00) collects batch results, runs the checker (also batched or standard), and publishes. Batches usually finish within an hour and expire after 24 hours.

---

## 4. Content sources (all free)

Every card stores `source_url` and `source_title` and shows a "Source" link. LLM-generated cards must be grounded in a fetched source; the model never writes facts from memory.

| Category | Source | How |
|---|---|---|
| `ai` news | Hacker News API (top/best stories filtered by AI keywords + score threshold) | Fetch linked page text (readability extraction), summarize into a news brief + 1 quiz |
| `ai` news | RSS feeds from AI labs and outlets (store the list in `lib/sources/feeds.ts` so I can edit it) | Same as above |
| `ai` research | arXiv API (cs.AI, cs.CL, cs.LG, newest, top by Hugging Face daily papers if available) | Abstract only → "What this paper found" card |
| `tech` | Wikipedia REST API, page summaries + sections for a seed list of "how it works" topics (GPS, Wi-Fi, touchscreens, vaccines, compilers, batteries, CDNs, encryption…) | Explainer (3 steps) + quiz |
| `life` | Wikipedia pages for named concepts (implementation intention, Parkinson's law, Pomodoro technique, spaced repetition, active listening, compound interest…) from a seed list | Tip card with a concrete "try it today" challenge + quiz |
| `world` | Wikimedia "featured content" / "on this day" feed | Fact + true/false |
| `world` | REST Countries API | **Procedural** geography quizzes: capitals, flags, which is bigger, which borders which |
| `world` | Open Trivia DB (categories: geography, history, science) | Use directly as quizzes; attribute per its license |
| `math` | none | **Procedural** generators in code |

Seed lists live in `lib/sources/seeds/*.json` (~100 topics each to start). Each topic is used once, then retired for 60 days.

**Copyright and licensing rules (enforced in the prompt and checker):** cards rewrite ideas in plain words, never copy sentences from the source; the `why` text is at most 45 words; Wikipedia and Open Trivia DB content is attributed; news cards always link to the original article.

---

## 5. Card types

All cards share:
```ts
type CardBase = {
  id: string;
  category: "ai" | "tech" | "life" | "world" | "math";
  type: CardType;
  difficulty: 1 | 2 | 3;
  tags: string[];
  source_url?: string;
  source_title?: string;
  created_at: string;
  expires_at?: string;        // news cards expire after 14 days
};
```

| Type | Fields | Interaction | XP |
|---|---|---|---|
| `news` | `headline` (≤ 12 words), `bullets` (3 × ≤ 18 words), `why_it_matters` (≤ 30 words) | Read, tap "Why it matters" | 2 |
| `quiz` | `question`, `options` (4), `answer` (index), `why` (≤ 45 words) | Tap an option; reveal right/wrong + why | 10 correct / 2 wrong |
| `tf` | `statement`, `answer` (bool), `why` | Two buttons | 10 / 2 |
| `fact` | `title` (≤ 25 words), `detail` (≤ 45 words) | Tap "Why?" | 2 |
| `explainer` | `title`, `steps` (3 × {heading, text ≤ 35 words}), `aside?` | Step through, story-style segment bar | 5 |
| `tip` | `title`, `body` (≤ 40 words), `challenge` (one concrete action for today) | "I'll try it" adds to today's challenges | 5 |
| `trick` | `title`, `body`, `examples` (2) | Read | 2 |
| `sprint` | generated client-side | 45 s mental math, on-screen keypad | 3 per correct |
| `map_quiz` (later) | country shape or flag + 4 options | Tap | 10 |

**Review cards:** any missed `quiz`/`tf` is re-served later with a "Review" badge (section 7). Correct on review = 15 XP.

---

## 6. Generation

### 6.1 Provider abstraction — `lib/llm/`
```ts
interface LLM {
  generateJSON<T>(opts: { system: string; user: string; schema: ZodSchema<T>; maxTokens: number }): Promise<T>;
  submitBatch?(requests: BatchRequest[]): Promise<string>;   // anthropic only
  collectBatch?(batchId: string): Promise<BatchResult[]>;
}
```
- `ollama.ts`: Ollama's native chat API with structured output (pass the card JSON schema in the `format` field; fall back to plain JSON mode if the installed version doesn't support schemas). Parse, validate with Zod, retry once with the error message appended. Process items sequentially (one model call at a time) so the laptop stays usable.
- `anthropic.ts`: Anthropic SDK. Force a single tool call whose `input_schema` is the card JSON schema. Put the shared system prompt in a cache-controlled block. Support batch submit/collect.

### 6.2 Generator prompt (system, shared by all providers)
```
You write cards for a learning app that replaces social media scrolling. The reader is
a curious adult who works in AI. Cards must be accurate, specific, and quick.

Rules:
- Use ONLY facts stated in the SOURCE text. If the source doesn't support a card, return
  {"cards": []}.
- Rewrite in your own plain words. Never copy a sentence from the source.
- Prefer one surprising, concrete detail (a number, a mechanism, a date) over general claims.
- Quiz distractors must be plausible to someone who skimmed the topic, and clearly wrong
  to someone who read the source. Exactly one correct answer.
- Respect the word limits for each field.
- For life-skill cards, the challenge must be one specific action doable today in under
  10 minutes.
- Return 1-3 cards matching the JSON schema. Choose the card types that fit the content.
```
User message: `CATEGORY`, `ALLOWED_TYPES`, `SOURCE_TITLE`, `SOURCE_URL`, `SOURCE` (extracted text, trimmed to ~1,500 tokens).

### 6.3 Checker pass
For every draft card, a second call with the source and the card asks:
```
Return {"supported": bool, "correct_answer_matches_source": bool, "copied_phrases": bool,
        "issues": string[]}
```
Publish only if `supported && correct_answer_matches_source && !copied_phrases`. Also run rule checks in code: word limits, 4 distinct options, answer index in range, no option repeated in the question, URL present. Log rejection reasons to `pipeline_runs` so I can tune prompts.

Small local models make more factual mistakes than Haiku, which is why the checker exists. When testing with Ollama, expect a higher rejection rate.

### 6.4 Procedural generators — `lib/procedural/`
- **Math:** addition/subtraction (2-3 digit), ×11 trick, two-digit × one-digit, percentages with integer answers, squares 11-30, doubling/halving chains. Difficulty scales with my sprint history.
- **Geography (REST Countries, cached weekly):** capital of X, which country is larger, which country uses currency Y, flag → country. Distractors from the same region.

### 6.5 Daily volume
Target ~150 published cards/day across categories: ai 35, tech 25, life 25, world 35 (half procedural), math sprints generated on demand.

---

## 7. Personalization and spaced repetition

**Events** recorded per card: `view` (with `dwell_ms`), `skip` (dwell < 1.5 s), `like`, `save`, `fewer`, `answer` (correct/wrong), `challenge_accepted`.

**Topic weights** per category and per tag, starting at 1.0:
- like +0.15, save +0.25, answered (either way) +0.05, dwell > 8 s +0.05
- skip −0.05, "fewer" −0.4
- clamp to 0.2 – 3.0; decay 2% per day toward 1.0 so the feed doesn't collapse into one topic

**Session builder** (`/api/session`, 15 cards):
1. Due review cards first priority, max 3, spread out (positions 4, 9, 13).
2. One math sprint around position 6-8.
3. Fill the rest by weighted random sampling of unseen live cards, with at most 2 cards of the same category in a row and at least 3 categories per session.
4. Freshness boost for `news` cards less than 24 h old.
5. Append the summary card.

**Spaced repetition** (simple Leitner): a missed card enters box 1 (due tomorrow). Correct moves it up a box (intervals 1, 3, 7, 16, 35 days); wrong drops it to box 1. Box 5 correct = retired.

---

## 8. UX (match `reference/prototype.html`)

- Dark, full-screen cards with a category color per topic; vertical scroll snap with `scroll-snap-stop: always`.
- Header: wordmark, streak, XP, saved count; topic chips ("For you", AI, How it works, Level up, World, Mental math); thin session progress bar.
- Right rail: Like, Save, Fewer. Double-tap anywhere on a card to like, with a heart burst.
- Floating "+XP" animation on rewards.
- Summary card: cards seen, quiz accuracy, XP earned, "misses come back as review cards", buttons "Another round" (builds a new session) and "I'm done".
- **Daily goal:** 2 sessions/day keeps the streak. Levels every 250 XP.
- **Saved library** screen: saved cards, searchable, grouped by category.
- **"What I learned this week"** screen: every card I answered correctly or saved, grouped by topic.
- Respect `prefers-reduced-motion`. Snappy: preload the next 3 cards; session API response < 300 ms.

---

## 9. Breaking the Instagram habit

- **Home screen:** put Scrollwise's icon in the slot Instagram used to be in; move Instagram off the first page.
- **Shortcuts automation:** Personal Automation → "App" → Instagram → "Is Opened" → action "Open URLs" with the Scrollwise URL, set to run immediately. Opening Instagram bounces me to Scrollwise (it opens in Safari rather than the installed app, which is fine). Add an in-app page with these steps and screenshots.
- **Work-hours nudge:** optional web push at a chosen afternoon time: "5-minute round?" (reuse Habit Garden's push setup).
- Later: log completed sessions as a habit in Habit Garden.

---

## 10. Data model (Supabase)

```sql
profiles (id uuid pk references auth.users, xp int default 0, level int default 1,
          streak int default 0, last_active date, daily_goal int default 2,
          topic_weights jsonb default '{}', created_at timestamptz default now())

raw_items (id uuid pk default gen_random_uuid(), source text, category text, url text unique,
           title text, text text, fetched_at timestamptz default now(), used boolean default false)

cards (id uuid pk default gen_random_uuid(), category text, type text, difficulty int,
       payload jsonb,          -- type-specific fields from section 5
       tags text[], source_url text, source_title text,
       status text default 'live',  -- draft | live | rejected | expired
       model text, created_at timestamptz default now(), expires_at timestamptz)

card_events (id bigserial pk, user_id uuid, card_id uuid, session_id uuid, kind text,
             value jsonb,      -- {correct:true} / {dwell_ms:5400}
             created_at timestamptz default now())

reviews (user_id uuid, card_id uuid, box int, due_on date, primary key (user_id, card_id))

sessions (id uuid pk default gen_random_uuid(), user_id uuid, started_at timestamptz default now(),
          ended_at timestamptz, cards_seen int, correct int, answered int, xp int)

saved (user_id uuid, card_id uuid, created_at timestamptz default now(), primary key (user_id, card_id))

pipeline_runs (id uuid pk default gen_random_uuid(), started_at timestamptz, provider text,
               raw_count int, drafted int, published int, rejected int, rejections jsonb, cost_usd numeric)
```
RLS: user-owned tables restricted to `auth.uid()`; `cards` readable by authenticated users, writable only with the service role.

---

## 11. Cost

Assumptions: ~1,500 input tokens (instructions + source) and ~350 output tokens per generated card. Claude Haiku 5.5 is $0.10 per million input tokens and $0.50 per million output tokens (for prompts under 100K tokens), and the Batch API halves that.

| Volume | Standard | With Batch API |
|---|---|---|
| 150 cards/day | ~$0.05/day, ~$1.50/month | ~$0.02/day, ~$0.75/month |
| 500 cards/day | ~$0.16/day, ~$4.90/month | ~$0.08/day, ~$2.45/month |

The checker pass adds roughly 50-80% on top. Prompt caching on the shared system prompt lowers input cost further. Ollama costs nothing beyond electricity. Log actual token usage per run in `pipeline_runs.cost_usd`.

---

## 12. Build phases (stop for review after each)

**Phase 0 — Scaffold + UI port.** Next.js + Supabase auth + PWA. Port the prototype into React components: copy its CSS (tokens, card colors, fonts, animations) as-is into the global stylesheet, keep its layout, copy, icons, and interactions, and move its seed cards to `data/seed-cards.json`. Create the GitHub repo, push, and walk me through connecting it to Vercel and adding env vars there. Include PWA icons and `apple-mobile-web-app` meta tags so it opens full-screen from the iPhone home screen.
*Done when:* the deployed app on my iPhone home screen looks and feels exactly like the prototype.

**Phase 1 — Card system + persistence.** Card schema (Zod), renderer per type, XP/streak/levels/saved in Supabase, events logging, summary card, saved library.
*Done when:* XP, streak, and saved cards survive closing the app.

**Phase 2 — Procedural content.** Math generators with difficulty scaling, REST Countries geography quizzes, Open Trivia DB import. Unit tests for every generator (answers always correct, distractors distinct).
*Done when:* I can play unlimited math and geography with zero LLM calls.

**Phase 3 — Ingestion.** Source fetchers (HN, RSS list, arXiv, Wikipedia seeds, Wikimedia feed), readable-text extraction, dedupe by URL, `raw_items`.
*Done when:* `npm run ingest` pulls 200+ fresh items.

**Phase 4 — LLM generation with Ollama (Windows).** First, check my laptop's RAM and GPU (give me the PowerShell commands) and recommend a model from Ollama's library that fits: smaller (around 3–8B) without a dedicated GPU, larger if there is one. Tell me the `ollama pull` command. Then build the `lib/llm` abstraction, generator prompt, checker, rule checks, `npm run pipeline` local script writing live cards, and `pipeline_runs` logging. Add a `/admin/review` page listing today's published and rejected cards with reasons. Finally, create a Windows Task Scheduler task (give me a PowerShell script `scripts/schedule-pipeline.ps1`) that runs the pipeline daily at 7:00 and on wake if missed.
*Done when:* a local run publishes 100+ cards, I spot-check 20 for accuracy, and the scheduled task runs on its own.

**Phase 5 — Haiku + batch + cron (do this later, after living with the Ollama version).** Anthropic provider, batch submit/collect, Vercel Cron routes protected by `CRON_SECRET`, cost logging. Switch with `LLM_PROVIDER`.
*Done when:* the overnight run publishes fresh cards with no laptop involved.

**Phase 6 — Personalization + spaced repetition.** Topic weights, session builder rules, Leitner reviews, freshness boost, "Fewer" handling.
*Done when:* liking AI cards visibly shifts my next sessions, and missed questions return on schedule.

**Phase 7 — Habit hooks + stats.** Shortcuts setup page, daily goal, optional push nudge, "What I learned this week", accuracy by topic.

**Later:** text-to-speech "listen mode", link-outs to curated educational YouTube Shorts, map/flag visuals, Habit Garden integration, difficulty-adaptive quizzes.

---

## 13. Testing checklist

- Unit: procedural generators, session builder constraints (no 3-in-a-row category, review placement), Leitner transitions, weight updates and clamps, XP/streak/day rollover in local time.
- Unit: Zod schemas reject over-length fields, duplicate options, out-of-range answers.
- Integration: pipeline with mocked LLM responses (valid, invalid JSON, checker rejection), batch collect with partial failures.
- Manual on iPhone: snap scrolling never lands between cards, double-tap like, keypad sprint, summary "Another round", installed PWA cold start under 2 s.

---

## 14. References

- Claude Haiku 5.5 model page (pricing, context): https://platform.claude.com/docs/en/models/haiku-5-5/overview
- Message Batches API (50% discount, timing): https://platform.claude.com/docs/en/build-with-claude/batch-processing
- Claude pricing: https://docs.claude.com/en/docs/about-claude/pricing
- Ollama model library and docs: https://ollama.com
