import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the external boundaries only — Redis and the Anthropic word generator.
// The real game logic (lib/game.js) runs unmocked.
vi.mock('../../lib/kv.js', () => ({
  getGame: vi.fn(),
  setGame: vi.fn(),
  deleteGame: vi.fn(),
}));
vi.mock('../../lib/words.js', () => ({
  getWords: vi.fn(),
}));

import { getGame, setGame } from '../../lib/kv.js';
import { getWords } from '../../lib/words.js';

import createGame from './index.js';
import hostState from './[gameId]/index.js';
import nextRound from './[gameId]/nextround.js';
import restart from './[gameId]/restart.js';
import teamsList from './[gameId]/teams.js';
import teamState from './[gameId]/team/[teamIndex]/index.js';
import guess from './[gameId]/team/[teamIndex]/guess.js';
import ready from './[gameId]/team/[teamIndex]/ready.js';

/** Minimal Express-like response capturing status + body. */
function makeRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function makeReq({ method = 'GET', body = {}, query = {} } = {}) {
  return { method, body, query };
}

/** A game object mid-flight, with sensible defaults overridable per test. */
function makeGame(overrides = {}) {
  return {
    teams: [
      { name: 'Team A', score: 0, ready: false, currentWordIndex: 0, roundHistory: [], pastRounds: {} },
      { name: 'Team B', score: 0, ready: false, currentWordIndex: 0, roundHistory: [], pastRounds: {} },
    ],
    words: ['ALPHA', 'BRAVO', 'CHARLIE'],
    genre: 'General',
    difficulty: 'medium',
    roundActive: false,
    roundDuration: 60,
    roundEndsAt: null,
    countdownEndsAt: null,
    gameStarted: false,
    currentRound: 1,
    totalRounds: 4,
    gameComplete: false,
    waitingForHost: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getGame.mockResolvedValue(null);
  setGame.mockResolvedValue(undefined);
  getWords.mockResolvedValue(['ALPHA', 'BRAVO', 'CHARLIE']);
});

describe('POST /api/games (create)', () => {
  it('rejects non-POST methods', async () => {
    const res = makeRes();
    await createGame(makeReq({ method: 'GET' }), res);
    expect(res.statusCode).toBe(405);
  });

  it('rejects fewer than two teams', async () => {
    const res = makeRes();
    await createGame(makeReq({ method: 'POST', body: { teams: [{ name: 'Solo' }] } }), res);
    expect(res.statusCode).toBe(400);
    expect(setGame).not.toHaveBeenCalled();
  });

  it('creates a game and returns a game id', async () => {
    const res = makeRes();
    await createGame(
      makeReq({ method: 'POST', body: { teams: [{ name: 'A' }, { name: 'B' }] } }),
      res
    );
    expect(res.body).toHaveProperty('gameId');
    expect(setGame).toHaveBeenCalledTimes(1);
    const [savedId, savedGame] = setGame.mock.calls[0];
    expect(savedId).toBe(res.body.gameId);
    expect(savedGame.teams).toHaveLength(2);
    expect(savedGame.teams[0]).toMatchObject({ name: 'A', score: 0, ready: false, currentWordIndex: 0 });
  });

  it('clamps round duration and total rounds into their valid ranges', async () => {
    const res = makeRes();
    await createGame(
      makeReq({
        method: 'POST',
        body: { teams: [{ name: 'A' }, { name: 'B' }], roundDuration: 5, totalRounds: 99 },
      }),
      res
    );
    const savedGame = setGame.mock.calls[0][1];
    expect(savedGame.roundDuration).toBe(30); // floored to 30
    expect(savedGame.totalRounds).toBe(10); // capped at 10
  });

  it('uses custom words (deduped + uppercased) and skips word generation', async () => {
    const res = makeRes();
    await createGame(
      makeReq({
        method: 'POST',
        body: {
          teams: [{ name: 'A' }, { name: 'B' }],
          customWords: ['cat', 'Dog', 'CAT', 'fish', 'bird', 'tree'],
        },
      }),
      res
    );
    const savedGame = setGame.mock.calls[0][1];
    expect(savedGame.words).toEqual(['CAT', 'DOG', 'FISH', 'BIRD', 'TREE']);
    expect(getWords).not.toHaveBeenCalled();
  });

  it('falls back to generated words when too few custom words are given', async () => {
    const res = makeRes();
    await createGame(
      makeReq({
        method: 'POST',
        body: { teams: [{ name: 'A' }, { name: 'B' }], customWords: ['only', 'three', 'words'] },
      }),
      res
    );
    expect(getWords).toHaveBeenCalledTimes(1);
  });

  it('regenerates the code when the first one collides with a live game', async () => {
    // First lookup finds an existing game (collision), second is free.
    getGame.mockResolvedValueOnce(makeGame()).mockResolvedValueOnce(null);
    const res = makeRes();
    await createGame(
      makeReq({ method: 'POST', body: { teams: [{ name: 'A' }, { name: 'B' }] } }),
      res
    );
    expect(getGame).toHaveBeenCalledTimes(2);
    expect(res.body).toHaveProperty('gameId');
    expect(setGame).toHaveBeenCalledTimes(1);
  });
});

describe('GET /api/games/:id (host state)', () => {
  it('returns 404 for an unknown game', async () => {
    const res = makeRes();
    await hostState(makeReq({ query: { gameId: 'NOPE' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('exposes waitingForHost so the host can advance only when appropriate', async () => {
    getGame.mockResolvedValue(makeGame({ gameStarted: true, waitingForHost: true }));
    const res = makeRes();
    await hostState(makeReq({ query: { gameId: 'G1' } }), res);
    expect(res.body.waitingForHost).toBe(true);
  });

  it('includes per-team round history for the scoreboard recap', async () => {
    const game = makeGame();
    game.teams[0].roundHistory = [{ word: 'ALPHA', result: 'correct' }];
    getGame.mockResolvedValue(game);
    const res = makeRes();
    await hostState(makeReq({ query: { gameId: 'G1' } }), res);
    expect(res.body.teams[0].roundHistory).toEqual([{ word: 'ALPHA', result: 'correct' }]);
  });
});

describe('POST /api/games/:id/nextround', () => {
  it('rejects advancing a completed game', async () => {
    getGame.mockResolvedValue(makeGame({ gameComplete: true }));
    const res = makeRes();
    await nextRound(makeReq({ method: 'POST', query: { gameId: 'G1' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('advances to the next round, archiving history and resetting per-team state', async () => {
    const game = makeGame({ currentRound: 1, waitingForHost: true });
    game.teams[0].roundHistory = [{ word: 'ALPHA', result: 'correct' }];
    game.teams[0].currentWordIndex = 2;
    game.teams[0].ready = true;
    getGame.mockResolvedValue(game);
    const res = makeRes();
    await nextRound(makeReq({ method: 'POST', query: { gameId: 'G1' } }), res);

    expect(res.body).toMatchObject({ success: true, currentRound: 2 });
    expect(game.waitingForHost).toBe(false);
    expect(game.teams[0].pastRounds[1]).toEqual([{ word: 'ALPHA', result: 'correct' }]);
    expect(game.teams[0].roundHistory).toEqual([]);
    expect(game.teams[0].currentWordIndex).toBe(0);
    expect(game.teams[0].ready).toBe(false);
    expect(getWords).toHaveBeenCalledTimes(1); // fresh words for the new round
  });

  it('does NOT complete the game when advancing into (not past) the last round', async () => {
    // Boundary: currentRound 3 of 4 → nextRound 4, which is not > totalRounds.
    getGame.mockResolvedValue(makeGame({ currentRound: 3, totalRounds: 4 }));
    const res = makeRes();
    await nextRound(makeReq({ method: 'POST', query: { gameId: 'G1' } }), res);
    expect(res.body).toMatchObject({ success: true, currentRound: 4 });
    expect(res.body.gameComplete).toBeUndefined();
  });

  it('completes the game and reports the winner on the final round', async () => {
    const game = makeGame({ currentRound: 4, totalRounds: 4 });
    game.teams[0].score = 7;
    game.teams[1].score = 3;
    getGame.mockResolvedValue(game);
    const res = makeRes();
    await nextRound(makeReq({ method: 'POST', query: { gameId: 'G1' } }), res);

    expect(res.body.gameComplete).toBe(true);
    expect(res.body.winner).toEqual({ tie: false, team: 'Team A', score: 7 });
    expect(game.gameComplete).toBe(true);
  });
});

describe('POST /api/games/:id/restart', () => {
  it('resets scores and progress while keeping the teams', async () => {
    const game = makeGame({ currentRound: 3, gameComplete: true });
    game.teams[0].score = 5;
    game.teams[1].score = 2;
    getGame.mockResolvedValue(game);
    const res = makeRes();
    await restart(
      makeReq({ method: 'POST', query: { gameId: 'G1' }, body: { genre: 'Movies' } }),
      res
    );

    expect(res.body).toMatchObject({ success: true, genre: 'Movies' });
    expect(game.currentRound).toBe(1);
    expect(game.gameComplete).toBe(false);
    expect(game.teams.every((t) => t.score === 0)).toBe(true);
    expect(game.genre).toBe('Movies');
    expect(getWords).toHaveBeenCalledWith('Movies', 'medium');
  });

  it('clamps overridden round settings', async () => {
    getGame.mockResolvedValue(makeGame());
    const res = makeRes();
    await restart(
      makeReq({ method: 'POST', query: { gameId: 'G1' }, body: { totalRounds: 50, roundDuration: 1 } }),
      res
    );
    const saved = setGame.mock.calls[0][1];
    expect(saved.totalRounds).toBe(10);
    expect(saved.roundDuration).toBe(30);
  });
});

describe('GET /api/games/:id/teams', () => {
  it('lists teams with their indexes', async () => {
    getGame.mockResolvedValue(makeGame());
    const res = makeRes();
    await teamsList(makeReq({ query: { gameId: 'G1' } }), res);
    expect(res.body.teams).toEqual([
      { name: 'Team A', index: 0 },
      { name: 'Team B', index: 1 },
    ]);
  });

  it('returns 404 when the game is missing', async () => {
    const res = makeRes();
    await teamsList(makeReq({ query: { gameId: 'X' } }), res);
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /api/games/:id/team/:i (team state)', () => {
  it('hides the current word when no round is active', async () => {
    getGame.mockResolvedValue(makeGame({ roundActive: false }));
    const res = makeRes();
    await teamState(makeReq({ query: { gameId: 'G1', teamIndex: '0' } }), res);
    expect(res.body.currentWord).toBe('');
  });

  it('shows the team-specific current word during an active round', async () => {
    const game = makeGame({ roundActive: true, roundEndsAt: Date.now() + 60000 });
    game.teams[0].currentWordIndex = 1;
    getGame.mockResolvedValue(game);
    const res = makeRes();
    await teamState(makeReq({ query: { gameId: 'G1', teamIndex: '0' } }), res);
    expect(res.body.currentWord).toBe('BRAVO');
  });

  it('includes all teams scores once the game is complete', async () => {
    const game = makeGame({ gameComplete: true });
    game.teams[0].score = 4;
    getGame.mockResolvedValue(game);
    const res = makeRes();
    await teamState(makeReq({ query: { gameId: 'G1', teamIndex: '0' } }), res);
    expect(res.body.allTeams).toEqual([
      { name: 'Team A', score: 4 },
      { name: 'Team B', score: 0 },
    ]);
  });

  it('returns 404 for an out-of-range team index', async () => {
    getGame.mockResolvedValue(makeGame());
    const res = makeRes();
    await teamState(makeReq({ query: { gameId: 'G1', teamIndex: '9' } }), res);
    expect(res.statusCode).toBe(404);
  });
});

describe('POST /api/games/:id/team/:i/guess', () => {
  it('scores a point and records a correct guess', async () => {
    const game = makeGame({ roundActive: true, roundEndsAt: Date.now() + 60000 });
    getGame.mockResolvedValue(game);
    const res = makeRes();
    await guess(makeReq({ method: 'POST', query: { gameId: 'G1', teamIndex: '0' }, body: { correct: true } }), res);

    expect(game.teams[0].score).toBe(1);
    expect(game.teams[0].roundHistory).toEqual([{ word: 'ALPHA', result: 'correct' }]);
    expect(game.teams[0].currentWordIndex).toBe(1);
    expect(res.body.currentWord).toBe('BRAVO');
  });

  it('records a skip without scoring', async () => {
    const game = makeGame({ roundActive: true, roundEndsAt: Date.now() + 60000 });
    getGame.mockResolvedValue(game);
    const res = makeRes();
    await guess(makeReq({ method: 'POST', query: { gameId: 'G1', teamIndex: '0' }, body: { correct: false } }), res);

    expect(game.teams[0].score).toBe(0);
    expect(game.teams[0].roundHistory).toEqual([{ word: 'ALPHA', result: 'skipped' }]);
  });

  it('wraps the word index around the end of the list', async () => {
    const game = makeGame({ roundActive: true, roundEndsAt: Date.now() + 60000 });
    game.teams[0].currentWordIndex = 2; // last of 3 words
    getGame.mockResolvedValue(game);
    const res = makeRes();
    await guess(makeReq({ method: 'POST', query: { gameId: 'G1', teamIndex: '0' }, body: { correct: true } }), res);
    expect(game.teams[0].currentWordIndex).toBe(0);
    expect(res.body.currentWord).toBe('ALPHA');
  });

  it('rejects guesses when no round is active', async () => {
    getGame.mockResolvedValue(makeGame({ roundActive: false }));
    const res = makeRes();
    await guess(makeReq({ method: 'POST', query: { gameId: 'G1', teamIndex: '0' }, body: { correct: true } }), res);
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/games/:id/team/:i/ready', () => {
  it('marks the team ready', async () => {
    const game = makeGame();
    getGame.mockResolvedValue(game);
    const res = makeRes();
    await ready(makeReq({ method: 'POST', query: { gameId: 'G1', teamIndex: '0' } }), res);
    expect(game.teams[0].ready).toBe(true);
    expect(res.body.allTeamsReady).toBe(false);
  });

  it('starts the countdown once the final team readies up before the first round', async () => {
    const game = makeGame();
    game.teams[0].ready = true; // other team already ready
    getGame.mockResolvedValue(game);
    const res = makeRes();
    await ready(makeReq({ method: 'POST', query: { gameId: 'G1', teamIndex: '1' } }), res);

    expect(res.body.allTeamsReady).toBe(true);
    expect(game.countdownEndsAt).toEqual(expect.any(Number));
    expect(res.body.countdown).toBeGreaterThan(0);
  });

  it('does not start the countdown when only some teams are ready', async () => {
    const game = makeGame(); // both teams start not-ready
    getGame.mockResolvedValue(game);
    const res = makeRes();
    await ready(makeReq({ method: 'POST', query: { gameId: 'G1', teamIndex: '0' } }), res);
    expect(res.body.allTeamsReady).toBe(false);
    expect(game.countdownEndsAt).toBeNull();
  });
});

// Every handler must reject the wrong HTTP method before doing anything else.
describe('HTTP method guards', () => {
  const cases = [
    ['create', createGame, 'GET', {}],
    ['host state', hostState, 'POST', { gameId: 'G1' }],
    ['nextround', nextRound, 'GET', { gameId: 'G1' }],
    ['restart', restart, 'GET', { gameId: 'G1' }],
    ['teams', teamsList, 'POST', { gameId: 'G1' }],
    ['team state', teamState, 'POST', { gameId: 'G1', teamIndex: '0' }],
    ['guess', guess, 'GET', { gameId: 'G1', teamIndex: '0' }],
    ['ready', ready, 'GET', { gameId: 'G1', teamIndex: '0' }],
  ];

  it.each(cases)('%s rejects the wrong method with 405', async (_name, handler, wrongMethod, query) => {
    const res = makeRes();
    await handler(makeReq({ method: wrongMethod, query }), res);
    expect(res.statusCode).toBe(405);
    expect(setGame).not.toHaveBeenCalled();
  });
});

// Handlers that load a game must guard against it being missing.
describe('missing-game guards', () => {
  const cases = [
    ['host state', hostState, 'GET', { gameId: 'X' }, 404],
    ['nextround', nextRound, 'POST', { gameId: 'X' }, 404],
    ['restart', restart, 'POST', { gameId: 'X' }, 404],
    ['teams', teamsList, 'GET', { gameId: 'X' }, 404],
    ['team state', teamState, 'GET', { gameId: 'X', teamIndex: '0' }, 404],
    ['ready', ready, 'POST', { gameId: 'X', teamIndex: '0' }, 404],
    // guess reports "invalid game state" (400) rather than 404 when the game is gone.
    ['guess', guess, 'POST', { gameId: 'X', teamIndex: '0' }, 400],
  ];

  it.each(cases)('%s returns %i when the game is not found', async (_name, handler, method, query, expected) => {
    getGame.mockResolvedValue(null);
    const res = makeRes();
    await handler(makeReq({ method, query, body: { correct: true } }), res);
    expect(res.statusCode).toBe(expected);
  });
});
