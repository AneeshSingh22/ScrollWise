# Scrollwise

A Reels-style vertical feed of short, interactive learning cards — AI news, how
tech works, life skills, general knowledge, mental math — built to replace
social-media scrolling. Runs as an iPhone home-screen PWA.

See [SPEC.md](SPEC.md) for the full build spec and
[START-HERE.md](START-HERE.md) for setup. `reference/prototype.html` is the
approved design; the app's CSS is ported from it unchanged.

## Running it locally

```powershell
npm install
npm run dev
```

Then open the URL it prints (http://localhost:3000, or the next free port).

To try it on your phone, use the `Network:` URL from the same output while the
phone is on the same Wi-Fi.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm test` | Vitest unit tests |
| `npm run typecheck` | `tsc --noEmit` |
| `npx tsx scripts/make-icons.ts` | Regenerate the PWA icons in `public/icons` |

## Layout

```
app/          Next.js App Router: layout (PWA meta), page, manifest, global CSS
components/   Header, Feed, CardView, one body component per card type
lib/          constants, local-storage profile, session/deck builder
lib/procedural/  code-generated content (math sprint; geography comes in Phase 2)
data/         seed-cards.json — the starter deck ported from the prototype
types/        card shapes (SPEC section 5)
tests/        Vitest: generators, deck/session builder, XP + streak rollover
scripts/      one-off dev scripts
```

## Phases

Built one phase at a time (SPEC section 12). **Phase 0 is done:** the prototype
runs as a real app with the full card deck, XP, streak, saved cards, review
queue, and math sprint, persisted in `localStorage`.

Next up — Phase 1: Supabase auth and moving that state server-side.

## Environment

Copy `.env.local.example` to `.env.local` and fill in as each phase needs it.
`.env.local` is gitignored and must never be committed.
