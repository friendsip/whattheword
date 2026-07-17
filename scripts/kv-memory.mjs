/**
 * In-memory stand-in for lib/kv.js, substituted by register-memory-kv.mjs
 * when running scripts/local-server.mjs. Same exports, same behaviour
 * (including the 1-hour TTL), no Redis or env vars needed.
 */
const GAME_TTL_MS = 60 * 60 * 1000;
const store = new Map(); // key -> { game, expiresAt }

export async function getGame(gameId) {
  const entry = store.get(`game:${gameId}`);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(`game:${gameId}`);
    return null;
  }
  // Deep copy so callers can't mutate the store between get/set, matching Redis
  return JSON.parse(JSON.stringify(entry.game));
}

export async function setGame(gameId, game) {
  store.set(`game:${gameId}`, {
    game: JSON.parse(JSON.stringify(game)),
    expiresAt: Date.now() + GAME_TTL_MS,
  });
}

export async function deleteGame(gameId) {
  store.delete(`game:${gameId}`);
}
