import { getGame, setGame } from '../../../lib/kv.js';
import { updateGameState, getTimeLeft } from '../../../lib/game.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { gameId } = req.query;
  const game = await getGame(gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  // Update game state (handle transitions)
  updateGameState(game);
  await setGame(gameId, game);

  res.json({
    teams: game.teams.map(team => ({
      name: team.name,
      score: team.score,
      ready: team.ready,
      roundHistory: team.roundHistory || [],
    })),
    roundActive: game.roundActive,
    timeLeft: getTimeLeft(game),
    roundDuration: game.roundDuration,
    gameStarted: game.gameStarted,
    currentRound: game.currentRound,
    totalRounds: game.totalRounds,
    gameComplete: game.gameComplete,
    waitingForHost: game.waitingForHost || false,
    genre: game.genre,
    difficulty: game.difficulty,
  });
}
