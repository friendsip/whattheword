# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"What the Word?!" is a multiplayer word-guessing party game. Teams of two take turns describing words to their partner without saying the word itself. The team with the most points wins.

## Commands

### Development (root directory)
```bash
npm run dev        # Run Vercel dev server (API + client)
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
- **Storage:** Vercel KV (Redis) with 1-hour TTL
- **Word generation:** Anthropic Claude Haiku API with hardcoded fallback words

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
- `words.js` — `getWords(genre)` calls Anthropic API; falls back to hardcoded word list on failure

### Frontend (client/src/)
- `App.js` — React Router: `/` → GameSetup, `/game/:gameId/team/:teamIndex` → Player
- `GameSetup.js` — Host creates game, then sees live scoreboard
- `Player.js` — Team view: ready up, see words, guess/skip during rounds

### Key Design Decisions

**Timestamp-based timing (no server-side timers):** Since serverless functions can't hold state between invocations, all timing uses timestamps (`roundEndsAt`, `countdownEndsAt`). The `updateGameState()` function checks these on every request and transitions state accordingly. Clients poll every 1 second to stay in sync.

**Client polling, not WebSockets:** Both GameSetup and Player components poll their respective API endpoints every 1 second via `setInterval`. There is no push mechanism.

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
- `ANTHROPIC_API_KEY` — For word generation
- `KV_REST_API_URL` — Auto-set when linking Vercel KV
- `KV_REST_API_TOKEN` — Auto-set when linking Vercel KV
