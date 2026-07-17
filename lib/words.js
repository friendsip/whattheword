import { WORD_PACKS } from './wordpacks.js';

/**
 * Serve words from the hand-vetted packs in wordpacks.js.
 *
 * This used to call the Anthropic API per game. It now draws from static,
 * human-reviewed packs instead: every word a child can be shown has been
 * vetted, games start instantly, cost nothing to run, and there is no
 * generation failure path. Teachers who want their own vocabulary (this
 * week's spelling list!) use the "Your Word List" option, which bypasses
 * this module entirely.
 *
 * The signature is unchanged (async, same arguments) so the API handlers
 * and their tests are unaffected.
 *
 * @param {string} genre - Category name (see GENRES); unknown → 'General'
 * @param {string} difficulty - easy | medium | hard; unknown → 'medium'
 * @returns {Promise<string[]>} A shuffled copy, uppercase
 */
export async function getWords(genre = 'General', difficulty = 'medium') {
  const pack = WORD_PACKS[genre] || WORD_PACKS['General'];
  const list = pack[difficulty] || pack.medium;
  return shuffle(list).map((word) => word.toUpperCase());
}

/** Fisher–Yates on a copy — never mutates the pack. */
function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
