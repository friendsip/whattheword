# What the Word?! - Vercel Deployment Guide

## Overview

This document explains the migration from an Express server to Vercel serverless functions and how to deploy and run the application.

---

## What Changed

### Before (Express Server)
- Single `server.js` file running Express on port 3001
- In-memory game state (lost on server restart)
- Required a long-running server process
- `setInterval` for game expiration cleanup

### After (Vercel Serverless)
- Serverless functions in `/api/` directory
- Game state persisted in Vercel KV (Redis)
- Automatic scaling, no server management
- Redis TTL handles game expiration (1 hour)

---

## Project Structure

```
wtw/
├── api/                              # Serverless API endpoints
│   └── games/
│       ├── index.js                  # POST /api/games (create game)
│       └── [gameId]/
│           ├── index.js              # GET /api/games/:gameId (host view)
│           ├── nextround.js          # POST /api/games/:gameId/nextround
│           ├── restart.js            # POST /api/games/:gameId/restart
│           └── team/
│               └── [teamIndex]/
│                   ├── index.js      # GET /api/games/:gameId/team/:teamIndex
│                   ├── ready.js      # POST .../ready
│                   └── guess.js      # POST .../guess
├── lib/                              # Shared code
│   ├── kv.js                         # Redis/KV database wrapper
│   ├── game.js                       # Game logic (timers, state updates)
│   └── words.js                      # Word generation with Claude AI
├── client/                           # React frontend (unchanged)
├── vercel.json                       # Vercel configuration
├── package.json                      # Root dependencies
└── CLAUDE.md                         # Developer reference
```

---

## Local Development

### Prerequisites
- Node.js 18+
- npm
- Vercel CLI (`npm i -g vercel`)
- A Vercel account (free tier works)

### Step 1: Install Dependencies

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..
```

### Step 2: Set Up Vercel KV for Local Development

You need a Vercel KV database even for local development:

1. Log in to Vercel CLI:
   ```bash
   vercel login
   ```

2. Link your project:
   ```bash
   vercel link
   ```

3. Create a KV database (if you haven't already):
   ```bash
   vercel kv create wtw-games
   ```
   Or create one in the Vercel dashboard under Storage → KV.

4. Pull environment variables to local:
   ```bash
   vercel env pull .env.local
   ```

### Step 3: Add Anthropic API Key

Add your Anthropic API key to `.env.local`:

```bash
echo "ANTHROPIC_API_KEY=your-key-here" >> .env.local
```

Or add it via the Vercel dashboard and pull again.

### Step 4: Run the Development Server

```bash
npm run dev
```

This starts the Vercel dev server which:
- Serves the React app
- Runs serverless functions locally
- Connects to your Vercel KV database

Open http://localhost:3000 in your browser.

---

## Production Deployment

### Step 1: Configure Environment Variables

In the Vercel dashboard (or CLI), set:

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key for word generation |
| `KV_REST_API_URL` | Auto-set when you link a KV database |
| `KV_REST_API_TOKEN` | Auto-set when you link a KV database |

To set via CLI:
```bash
vercel env add ANTHROPIC_API_KEY
```

### Step 2: Deploy

Preview deployment:
```bash
vercel
```

Production deployment:
```bash
vercel --prod
```

### Step 3: Verify

1. Visit your deployment URL
2. Create a test game
3. Open team links in separate tabs
4. Play through a round to verify everything works

---

## How It Works

### Game State Storage

Games are stored in Vercel KV (Redis) with the key pattern `game:{gameId}`:

```javascript
// Saving a game (with 1-hour TTL)
await kv.set(`game:${gameId}`, gameObject, { ex: 3600 });

// Retrieving a game
const game = await kv.get(`game:${gameId}`);
```

The 1-hour TTL automatically cleans up old games (replacing the old `setInterval` cleanup).

### Serverless Function Pattern

Each API endpoint follows this pattern:

```javascript
import { getGame, setGame } from '../../../lib/kv.js';
import { updateGameState } from '../../../lib/game.js';

export default async function handler(req, res) {
  // 1. Validate HTTP method
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Get game from Redis
  const { gameId } = req.query;
  const game = await getGame(gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  // 3. Update game state (handle timer-based transitions)
  updateGameState(game);

  // 4. Save updated state back to Redis
  await setGame(gameId, game);

  // 5. Return response
  res.json({ /* game data */ });
}
```

### Timer-Based State

Since serverless functions can't use `setInterval`, game timing is handled differently:

1. **Timestamps stored in game state**: `roundEndsAt`, `countdownEndsAt`
2. **State computed on each request**: `updateGameState()` checks current time vs timestamps
3. **Client polling**: Frontend polls every 1 second, triggering state updates

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/games` | Create a new game |
| GET | `/api/games/:gameId` | Get game state (host scoreboard) |
| POST | `/api/games/:gameId/nextround` | Advance to next round |
| POST | `/api/games/:gameId/restart` | Restart game with same teams |
| GET | `/api/games/:gameId/team/:teamIndex` | Get team-specific state |
| POST | `/api/games/:gameId/team/:teamIndex/ready` | Mark team as ready |
| POST | `/api/games/:gameId/team/:teamIndex/guess` | Submit a guess |

---

## Troubleshooting

### "Game not found" errors
- Games expire after 1 hour of inactivity
- Check that KV database is properly linked

### Word generation fails
- Verify `ANTHROPIC_API_KEY` is set correctly
- The app falls back to hardcoded words if the API fails

### Local dev not connecting to KV
- Run `vercel env pull .env.local` to get latest credentials
- Ensure you're running `npm run dev` (not `npm start`)

### Deployment fails
- Check Vercel build logs for errors
- Ensure all dependencies are in `package.json`
- Verify `vercel.json` configuration is correct

---

## Cost Considerations

### Vercel Free Tier Limits
- **Serverless Functions**: 100GB-hours/month
- **KV Storage**: 256MB, 10,000 requests/day
- **Bandwidth**: 100GB/month

For a party game with occasional use, the free tier should be more than sufficient.

### Anthropic API
- Word generation uses Claude Haiku (cheapest model)
- ~20 words generated per game creation and per round
- Minimal cost for typical usage

---

## Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **Vercel KV Docs**: https://vercel.com/docs/storage/vercel-kv
- **Anthropic Docs**: https://docs.anthropic.com
