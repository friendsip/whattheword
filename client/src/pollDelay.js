/**
 * How long to wait before the next state poll.
 *
 * Poll fast only when the screen is about to change by itself — a countdown
 * is running, a round is in play, or a round start is imminent because
 * teams are readying up. Everywhere else (lobby, between rounds, game over)
 * a relaxed poll keeps things feeling live while sending far fewer requests
 * — every poll is a Redis command on the server, and a classroom can have
 * fifteen devices doing this at once.
 *
 * Works for both the host/spectator payload (full game with `teams`) and
 * the player payload (team view with its own `ready` flag).
 */
export function pollDelay(game) {
  if (!game) return 1000;
  if (game.roundActive || game.countdownEndsAt) return 1000;
  if (game.ready && !game.gameComplete) return 1000;
  if (
    !game.gameComplete &&
    Array.isArray(game.teams) &&
    game.teams.some((team) => team.ready)
  ) {
    return 1000;
  }
  return 2500;
}
