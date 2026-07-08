import { Redis } from '@upstash/redis';

// TTL for games: 1 hour
const GAME_TTL_SECONDS = 3600;

// Lazily create the client so importing this module never requires env vars
// (the tests mock this module). Accepts either the Upstash-named vars a fresh
// Upstash Redis store injects or the legacy KV_* names, so it connects to any
// Vercel Marketplace Redis store with no extra config.
let redis;
function client() {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
    });
  }
  return redis;
}

/**
 * Get a game from Redis
 * @param {string} gameId - The game ID
 * @returns {Promise<object|null>} The game object or null if not found
 */
export async function getGame(gameId) {
  return await client().get(`game:${gameId}`);
}

/**
 * Save a game to Redis with TTL
 * @param {string} gameId - The game ID
 * @param {object} game - The game object
 * @returns {Promise<void>}
 */
export async function setGame(gameId, game) {
  await client().set(`game:${gameId}`, game, { ex: GAME_TTL_SECONDS });
}

/**
 * Delete a game from Redis
 * @param {string} gameId - The game ID
 * @returns {Promise<void>}
 */
export async function deleteGame(gameId) {
  await client().del(`game:${gameId}`);
}
