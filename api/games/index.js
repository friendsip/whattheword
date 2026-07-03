import { getGame, setGame } from '../../lib/kv.js';
import { generateUniqueCode } from '../../lib/game.js';
import { getWords } from '../../lib/words.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    teams,
    totalRounds = 4,
    roundDuration = 60,
    genre = 'General',
    customWords,
    difficulty = 'medium',
  } = req.body;

  if (!teams || !Array.isArray(teams) || teams.length < 2) {
    return res.status(400).json({ error: 'At least 2 teams are required' });
  }

  // Generate a code, retrying on the rare chance it collides with a live game
  let gameId = generateUniqueCode();
  for (let attempt = 0; attempt < 5 && (await getGame(gameId)); attempt++) {
    gameId = generateUniqueCode();
  }

  // Use custom words if provided, otherwise generate via API.
  // A custom list is kept on the game so later rounds reuse it
  // instead of regenerating words.
  let words;
  let customWordList = null;
  if (customWords && Array.isArray(customWords) && customWords.length >= 5) {
    customWordList = customWords
      .map(w => w.trim().toUpperCase())
      .filter(w => w.length > 0)
      .filter((w, i, arr) => arr.indexOf(w) === i) // deduplicate
      .slice(0, 50);
    words = customWordList;
  } else {
    words = await getWords(genre, difficulty);
  }

  const clampedRoundDuration = Math.min(Math.max(roundDuration, 30), 180);

  const game = {
    teams: teams.map((team, i) => ({
      name: team.name,
      score: 0,
      ready: false,
      currentWordIndex: 0,
      roundHistory: [],
      pastRounds: {},
      claimed: true,
    })),
    words,
    customWords: customWordList,
    genre,
    difficulty,
    roundActive: false,
    roundDuration: clampedRoundDuration,
    roundEndsAt: null,
    countdownEndsAt: null,
    gameStarted: false,
    currentRound: 1,
    totalRounds: Math.min(Math.max(totalRounds, 1), 10),
    gameComplete: false,
    waitingForHost: false,
    createdAt: Date.now(),
  };

  await setGame(gameId, game);
  res.json({ gameId });
}
