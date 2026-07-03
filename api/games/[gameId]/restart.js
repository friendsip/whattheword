import { getGame, setGame } from '../../../lib/kv.js';
import { shuffleWords } from '../../../lib/game.js';
import { getWords } from '../../../lib/words.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { gameId } = req.query;
  const { genre, totalRounds, roundDuration, difficulty } = req.body;
  const game = await getGame(gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  // Reset game state but keep teams
  game.genre = genre || game.genre;
  game.difficulty = difficulty || game.difficulty || 'medium';
  game.totalRounds = totalRounds ? Math.min(Math.max(totalRounds, 1), 10) : game.totalRounds;
  game.roundDuration = roundDuration ? Math.min(Math.max(roundDuration, 30), 180) : game.roundDuration;
  // Replaying with the same custom list reuses it (reshuffled);
  // choosing any other category discards the list and generates words.
  if (game.customWords && game.genre === 'Custom Words') {
    game.words = shuffleWords(game.customWords);
  } else {
    game.customWords = null;
    game.words = await getWords(game.genre, game.difficulty);
  }
  game.roundActive = false;
  game.roundEndsAt = null;
  game.countdownEndsAt = null;
  game.gameStarted = false;
  game.currentRound = 1;
  game.gameComplete = false;
  game.waitingForHost = false;
  game.teams.forEach(team => {
    team.score = 0;
    team.ready = false;
    team.currentWordIndex = 0;
    team.roundHistory = [];
    team.pastRounds = {};
  });

  await setGame(gameId, game);
  res.json({ success: true, genre: game.genre });
}
