# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"What the Word?!" is a multiplayer word-guessing game for classrooms and families. Teams of two take turns describing words to their partner without saying the word itself. The team with the most points wins.

**It is part of yourkids.com** (July 2026): served at games.yourkids.com, styled in the YourKids "Warm & Playful" design (Baloo 2 / Nunito Sans, cream `#FBF7EF`, coral `#D96A47`, teal `#3A9E8F` — the tokens in `client/src/index.css` mirror the site's `global.css`), with a slim YourKids bar + exit link on every screen (`App.js`). Content is classroom-safe by design: words come only from the hand-vetted packs (below) or a teacher's own typed list, and the setup screen nudges towards made-up team names, not children's real names. The main site's privacy policy §3b describes the game's data handling — keep them in sync.

## Commands

### Development (root directory)
```bash
npm run dev        # Vercel dev server (API + client) — needs Redis env vars
npm run local      # No-dependencies local server: real API handlers +
                   #   client/build with in-memory storage (scripts/).
                   #   Rebuild the client first: cd client && REACT_APP_API_URL= npm run build
```

### Client (client/ directory)
```bash
cd client
npm start          # Run React dev server on port 3000
npm run build      # Build for production
npm test           # Run tests (interactive watch mode)
```

### Deployment
```bash
vercel             # Deploy to preview
vercel --prod      # Deploy to production
```

## Architecture

### Tech Stack
- **Backend:** Vercel serverless functions (Node.js, ES modules)
- **Frontend:** React 18 + React Router 6 + Axios (Create React App)
- **Storage:** Upstash Redis with 1-hour TTL
- **Words:** hand-vetted static packs in `lib/wordpacks.js` — 13 categories × 3 difficulties, ≥20 words each, classroom-safe (no partisan politics, brands, or anything a paediatrician wouldn't share). `lib/words.js` shuffles and serves them; unknown categories fall back to General. **This replaced live Anthropic word generation (July 2026)** so every word shown to a child is reviewed in advance, games cost nothing, and there's no generation failure path — `ANTHROPIC_API_KEY` is no longer used anywhere. When adding a category, add its icon to `client/src/CategoryIcon.js` and the option to `CATEGORY_OPTIONS` in `GameSetup.js`, and keep `lib/words.test.js` green.

### API Endpoints (Vercel file-based routing)
```
POST   /api/games                              → Create game
GET    /api/games/:gameId                      → Game state (host view)
POST   /api/games/:gameId/nextround            → Advance round
POST   /api/games/:gameId/restart              → Restart game
GET    /api/games/:gameId/team/:teamIndex      → Team state
POST   /api/games/:gameId/team/:teamIndex/ready → Mark team ready
POST   /api/games/:gameId/team/:teamIndex/guess → Submit guess (correct/skip)
```

All API handlers follow the same pattern: validate method → load game from KV → call `updateGameState(game)` → mutate → save back → return relevant subset.

### Shared Libraries (lib/)
- `kv.js` — Thin Vercel KV wrapper: `getGame()`, `setGame()`, `deleteGame()`
- `game.js` — Pure game logic: `updateGameState()`, `getTimeLeft()`, `startCountdown()`, `getWinner()`
- `words.js` — `getWords(genre, difficulty)` serves a shuffled copy from `wordpacks.js` (async signature kept from the old API era so handlers/tests are unchanged)
- `wordpacks.js` — the vetted word packs themselves (see Tech Stack)

### Frontend (client/src/)
- `App.js` — React Router: `/` → GameSetup, `/game/:gameId/team/:teamIndex` → Player
- `GameSetup.js` — Host creates game, then sees live scoreboard
- `Player.js` — Team view: ready up, see words, guess/skip during rounds

### Key Design Decisions

**Timestamp-based timing (no server-side timers):** Since serverless functions can't hold state between invocations, all timing uses timestamps (`roundEndsAt`, `countdownEndsAt`). The `updateGameState()` function checks these on every request and transitions state accordingly. Clients poll every 1 second to stay in sync.

**Client polling, not WebSockets:** GameSetup, Player and Spectator poll their API endpoints via a recursive `setTimeout` whose delay comes from `client/src/pollDelay.js` — 1s while play is live (countdown running, round active, or teams readying up), 2.5s in lobbies and between rounds. Keeps the game feeling instant while roughly halving Redis commands across a classroom of devices. There is no push mechanism.

**Game state is a single JSON object in Redis:** The entire game (teams, words, round state, scores) is stored as one key. Every API call reads, potentially mutates, and writes back the full object.

### Game State Machine
1. **Setup** — Host creates game, teams join via shared URLs
2. **Waiting for ready** — All teams must call `/ready`; when all ready, 5-second countdown starts
3. **Countdown** (`countdownEndsAt` set) — Clients show countdown timer
4. **Round active** (`roundActive=true`, `roundEndsAt` set) — Teams guess words (Got it!/Skip)
5. **Round over** → `waitingForHost=true` — Host clicks "Start Round X" to advance
6. **Repeat** steps 2-5 until all rounds complete → `gameComplete=true`

### Parameter Constraints
- `roundDuration`: clamped to 30–180 seconds
- `totalRounds`: clamped to 1–10
- Word cycling wraps: `(currentWordIndex + 1) % words.length`

### Environment Variables
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (or the legacy `KV_*` names) — auto-set when linking the Upstash Redis store
- `ANTHROPIC_API_KEY` — **no longer needed** (words are static packs); safe to remove from `.env` files and the Vercel project
- `REACT_APP_API_URL` (client, dev only) — set to `http://localhost:3001` in `client/.env.local` for the `vercel dev` workflow; must be empty/unset for production and `npm run local` builds
