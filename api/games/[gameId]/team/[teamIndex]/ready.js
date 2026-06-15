import { getGame, setGame } from '../../../../../lib/kv.js';
import { startCountdown, getCountdown } from '../../../../../lib/game.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { gameId, teamIndex } = req.query;
  const game = await getGame(gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const team = game.teams[teamIndex];
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  team.ready = true;

  // Check if all teams are ready
  if (game.teams.every((t) => t.ready) && !game.gameStarted && !game.countdownEndsAt) {
    startCountdown(game);
  }

  await setGame(gameId, game);

  res.json({
    success: true,
    allTeamsReady: game.teams.every((t) => t.ready),
    countdown: getCountdown(game)
  });
}
