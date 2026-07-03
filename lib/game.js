/**
 * Generate a unique 6-character game code
 * @returns {string} Uppercase alphanumeric game code
 */
export function generateUniqueCode() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

/**
 * Start the countdown before a round begins
 * @param {object} game - The game object
 */
export function startCountdown(game) {
  if (game.countdownEndsAt) return; // Prevent multiple countdowns

  const now = Date.now();
  game.countdownEndsAt = now + 5000; // 5 second countdown
  game.roundEndsAt = now + 5000 + (game.roundDuration * 1000); // Round starts after countdown
}

/**
 * Return a new array with the same words in random order (Fisher–Yates).
 * Used to vary the order of a fixed custom word list between rounds.
 * @param {string[]} words
 * @returns {string[]} New shuffled array
 */
export function shuffleWords(words) {
  const shuffled = [...words];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Update game state based on timestamps (handle transitions)
 * @param {object} game - The game object (mutated in place)
 */
export function updateGameState(game) {
  const now = Date.now();

  // Handle countdown completion
  if (game.countdownEndsAt && now >= game.countdownEndsAt) {
    game.gameStarted = true;
    game.roundActive = true;
    game.countdownEndsAt = null;
  }

  // Handle round end
  if (game.roundActive && game.roundEndsAt && now >= game.roundEndsAt) {
    game.roundActive = false;
    game.waitingForHost = true;
    game.roundEndsAt = null;
    game.teams.forEach((team) => {
      team.ready = false;
    });
  }

  // Handle all teams ready for subsequent rounds — trigger countdown
  if (game.gameStarted && !game.waitingForHost && !game.roundActive &&
      game.teams.every((team) => team.ready) && !game.roundEndsAt && !game.countdownEndsAt) {
    startCountdown(game);
  }
}

/**
 * Compute time left in the current round
 * @param {object} game - The game object
 * @returns {number} Seconds remaining
 */
export function getTimeLeft(game) {
  if (!game.roundEndsAt) return game.roundDuration;
  return Math.max(0, Math.ceil((game.roundEndsAt - Date.now()) / 1000));
}

/**
 * Compute countdown time remaining
 * @param {object} game - The game object
 * @returns {number} Seconds remaining in countdown
 */
export function getCountdown(game) {
  if (!game.countdownEndsAt) return 0;
  return Math.max(0, Math.ceil((game.countdownEndsAt - Date.now()) / 1000));
}

/**
 * Determine the winner of a completed game
 * @param {object} game - The game object
 * @returns {object} Winner info with tie status
 */
export function getWinner(game) {
  const sorted = [...game.teams].sort((a, b) => b.score - a.score);
  if (sorted[0].score === sorted[1]?.score) {
    return { tie: true, teams: sorted.filter(t => t.score === sorted[0].score).map(t => t.name) };
  }
  return { tie: false, team: sorted[0].name, score: sorted[0].score };
}
