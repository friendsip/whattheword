import { getGame } from '../../../lib/kv.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { gameId } = req.query;
  const game = await getGame(gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  res.json({
    teams: game.teams.map((team, index) => ({
      name: team.name,
      index,
    })),
    genre: game.genre,
    difficulty: game.difficulty,
  });
}
