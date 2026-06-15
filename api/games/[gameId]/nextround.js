import { getGame, setGame } from '../../../lib/kv.js';
import { getWinner } from '../../../lib/game.js';
import { getWords } from '../../../lib/words.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { gameId } = req.query;
  const game = await getGame(gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  if (game.gameComplete) {
    return res.status(400).json({ error: 'Game is already complete' });
  }

  const nextRound = (game.currentRound || 1) + 1;

  if (nextRound > game.totalRounds) {
    // Game is complete
    game.gameComplete = true;
    game.roundActive = false;
    await setGame(gameId, game);
    return res.json({
      success: true,
      gameComplete: true,
      winner: getWinner(game),
    });
  }

  // Archive round history before advancing
  game.teams.forEach(team => {
    if (!team.pastRounds) team.pastRounds = {};
    team.pastRounds[game.currentRound] = team.roundHistory || [];
    team.roundHistory = [];
  });

  // Advance to next round
  game.currentRound = nextRound;
  game.waitingForHost = false;
  game.teams.forEach(team => {
    team.ready = false;
    team.currentWordIndex = 0;
  });

  // Refresh words for the new round
  game.words = await getWords(game.genre, game.difficulty);

  await setGame(gameId, game);
  res.json({ success: true, currentRound: game.currentRound });
}
