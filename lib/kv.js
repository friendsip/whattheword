import { kv } from '@vercel/kv';

// TTL for games: 1 hour
const GAME_TTL_SECONDS = 3600;

/**
 * Get a game from Redis
 * @param {string} gameId - The game ID
 * @returns {Promise<object|null>} The game object or null if not found
 */
export async function getGame(gameId) {
  return await kv.get(`game:${gameId}`);
}

/**
 * Save a game to Redis with TTL
 * @param {string} gameId - The game ID
 * @param {object} game - The game object
 * @returns {Promise<void>}
 */
export async function setGame(gameId, game) {
  await kv.set(`game:${gameId}`, game, { ex: GAME_TTL_SECONDS });
}

/**
 * Delete a game from Redis
 * @param {string} gameId - The game ID
 * @returns {Promise<void>}
 */
export async function deleteGame(gameId) {
  await kv.del(`game:${gameId}`);
}
