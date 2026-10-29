# Scrollwise — Start Here

Everything you need to build Scrollwise with Claude Code on your Windows laptop, starting with the free local model.

## What's in this folder

```
scrollwise/
├─ START-HERE.md              ← this guide (for you)
├─ CLAUDE.md                  ← rules Claude Code reads automatically
├─ SPEC.md                    ← the full build spec
└─ reference/
   └─ prototype.html          ← the design to match (open it in a browser to see it)
```

## 1. One-time setup (about 20 minutes)

**Install on the laptop**
1. Node.js LTS: nodejs.org → download the LTS installer.
2. Git for Windows: git-scm.com.
3. Ollama for Windows: ollama.com → Download for Windows. (Claude Code will tell you which model to pull in Phase 4.)
4. Claude Code, if it isn't installed yet.

**Create free accounts**
5. GitHub (where the code lives).
6. Vercel, signing in with GitHub (hosts the app for your phone).
7. Supabase (database and login).

Claude Code will tell you exactly which keys to copy from Supabase and Vercel when it needs them.

## 2. Set up the project folder

1. Unzip this folder somewhere easy, like `C:\Users\<you>\projects\scrollwise`.
2. Open PowerShell in that folder (in File Explorer, type `powershell` in the address bar and press Enter).
3. Run `git init`.
4. Run `claude` to start Claude Code.

## 3. The prompts to paste

**First prompt:**
> Read CLAUDE.md, SPEC.md, and reference/prototype.html. Implement Phase 0, then stop and tell me exactly how to test it on my laptop and on my iPhone.

**After each phase, once you've tested it:**
> Phase N works. Commit, push, and implement Phase N+1.

If something looks wrong, describe it in plain words ("the cards don't snap on my phone", "the quiz colors are off compared to the prototype") and ask it to fix that before moving on.

**Order for the free version:** Phases 0 → 1 → 2 → 3 → 4 → 6 → 7. Skip Phase 5 (Claude Haiku) for now.

| Phase | What you get |
|---|---|
| 0 | The prototype as a real app, live on Vercel, on your home screen |
| 1 | XP, streak, saved cards stored for real |
| 2 | Unlimited mental math and geography, no AI needed |
| 3 | Pulls fresh AI news, Wikipedia topics, and trivia daily |
| 4 | Your laptop's free model turns those into cards, with fact-checking; runs every morning automatically |
| 6 | The feed learns what you like; missed questions come back on a schedule |
| 7 | Instagram redirect setup, daily goal, "what I learned this week" |
| 5 (later) | Switch to Claude Haiku so new cards are made in the cloud even when your laptop is off |

## 4. Put it on your iPhone (after Phase 0)

1. Open your Vercel URL in **Safari**.
2. Tap Share → **Add to Home Screen**.
3. Open it from the home screen icon so it runs full-screen like an app.

## 5. How daily content works on the free version

Your laptop makes the cards (Ollama), saves them to Supabase, and your phone reads them from there. Phase 4 sets up a scheduled task to run this every morning. If the laptop was off, open PowerShell in the project folder and run `npm run pipeline`. Math and geography cards never depend on the laptop, so the feed always has something.

## 6. Switching to Claude Haiku later

1. Create an API key in the Claude Console (platform.claude.com) and add a few dollars of credit. At ~150 cards a day it costs about $1–2 a month.
2. Tell Claude Code: "Implement Phase 5." It will add the key to Vercel and switch `LLM_PROVIDER` to `anthropic`.
3. After that, new cards are made overnight in the cloud and your laptop is no longer needed.
