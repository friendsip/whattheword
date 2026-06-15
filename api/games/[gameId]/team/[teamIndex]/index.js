import { getGame, setGame } from '../../../../../lib/kv.js';
import { updateGameState, getTimeLeft, getCountdown } from '../../../../../lib/game.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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

  // Update game state (handle transitions)
  updateGameState(game);
  await setGame(gameId, game);

  const response = {
    teamName: team.name,
    score: team.score,
    currentWord: game.roundActive ? game.words[team.currentWordIndex] : '',
    roundActive: game.roundActive,
    timeLeft: getTimeLeft(game),
    roundDuration: game.roundDuration,
    roundEndsAt: game.roundEndsAt,
    countdownEndsAt: game.countdownEndsAt,
    gameStarted: game.gameStarted,
    ready: team.ready,
    countdown: getCountdown(game),
    allTeamsReady: game.teams.every((t) => t.ready),
    currentRound: game.currentRound,
    totalRounds: game.totalRounds,
    gameComplete: game.gameComplete,
    waitingForHost: game.waitingForHost || false,
    genre: game.genre,
    roundHistory: team.roundHistory || [],
    teamsReadyStatus: game.teams.map(t => ({ name: t.name, ready: t.ready })),
  };

  // Include all teams' scores when game is complete
  if (game.gameComplete) {
    response.allTeams = game.teams.map(t => ({
      name: t.name,
      score: t.score,
    }));
  }

  res.json(response);
}
