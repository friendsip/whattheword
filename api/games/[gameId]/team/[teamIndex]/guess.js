import { getGame, setGame } from '../../../../../lib/kv.js';
import { updateGameState, getTimeLeft, getCountdown } from '../../../../../lib/game.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { gameId, teamIndex } = req.query;
  const { correct } = req.body;
  const game = await getGame(gameId);

  // Update game state first (check if round ended)
  if (game) updateGameState(game);

  if (!game || !game.roundActive) {
    return res.status(400).json({ error: 'Invalid game state' });
  }

  const team = game.teams[teamIndex];
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  // Record word history
  const currentWord = game.words[team.currentWordIndex];
  if (!team.roundHistory) team.roundHistory = [];
  team.roundHistory.push({
    word: currentWord,
    result: correct ? 'correct' : 'skipped',
  });

  if (correct) {
    team.score += 1;
  }
  team.currentWordIndex = (team.currentWordIndex + 1) % game.words.length;

  await setGame(gameId, game);

  res.json({
    currentWord: game.words[team.currentWordIndex],
    score: team.score,
    roundActive: game.roundActive,
    timeLeft: getTimeLeft(game),
    roundDuration: game.roundDuration,
    roundEndsAt: game.roundEndsAt,
    countdownEndsAt: game.countdownEndsAt,
    gameStarted: game.gameStarted,
    ready: team.ready,
    countdown: getCountdown(game),
    allTeamsReady: game.teams.every((t) => t.ready),
    teamName: team.name,
    genre: game.genre,
    currentRound: game.currentRound,
    totalRounds: game.totalRounds,
    gameComplete: game.gameComplete,
    waitingForHost: game.waitingForHost || false,
    roundHistory: team.roundHistory || [],
    teamsReadyStatus: game.teams.map(t => ({ name: t.name, ready: t.ready })),
  });
}
