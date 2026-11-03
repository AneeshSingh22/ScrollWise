# Scrollwise — rules for Claude Code

- Follow SPEC.md. Build one phase at a time (SPEC.md section 12). After each phase, stop, summarize what you built, and tell me exactly how to test it (on the laptop and on my iPhone).
- reference/prototype.html is the approved design. Match it exactly: dark UI, category colors, fonts (Unbounded, Figtree, JetBrains Mono), full-screen snap cards, right-side Like/Save/Fewer rail, double-tap heart, floating +XP, streak/XP/saved pills, topic chips, session progress bar, summary card. Reuse its CSS and copy rather than redesigning. Ask before changing the look.
- I'm on Windows. Scripts are cross-platform Node/TypeScript run with tsx. No bash-only scripts. When I need to run something, give me PowerShell commands.
- Start with LLM_PROVIDER=ollama (free, local). Don't build the Claude Haiku provider until I ask for Phase 5.
- Every LLM call goes through lib/llm/. Never call a provider SDK directly elsewhere.
- Every generated card must pass Zod validation, the rule checks, and the checker pass before it goes live.
- Never copy article text into cards. Rewrite in plain words and always store and show the source link.
- Secrets live in .env.local (never committed) and in Vercel env vars. The Supabase service role key and any API keys are server-side or local-script only.
- Write Vitest tests for procedural generators, the session builder, spaced repetition, and XP/streak logic.
- Commit after each working step with clear messages. Keep .env.local in .gitignore.
- If you need an account, key, or click in a website from me (GitHub, Vercel, Supabase), stop and give me numbered steps.
- New learning topics: when asked for a new topic or lessons on a subject (often via "/new-topic <topic>" from the app's "Make it with Claude" button, in a cloud session on my phone), follow `.claude/skills/new-topic/SKILL.md` exactly: write `data/topics/<slug>.json`, do the checker pass, run `npm run content`, `npm test` and `npm run typecheck`, then push to main so Vercel deploys. Keep the reply short — I'm on my phone.
