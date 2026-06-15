import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateUniqueCode,
  startCountdown,
  updateGameState,
  getTimeLeft,
  getCountdown,
  getWinner,
} from './game.js';

// Fixed reference time so all Date.now()-based logic is deterministic.
const NOW = 1_700_000_000_000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

/**
 * Build a game object in a given phase. Defaults to a fresh 2-team game.
 */
function makeGame(overrides = {}) {
  return {
    teams: [
      { name: 'Team A', score: 0, ready: false },
      { name: 'Team B', score: 0, ready: false },
    ],
    roundActive: false,
    roundDuration: 60,
    roundEndsAt: null,
    countdownEndsAt: null,
    gameStarted: false,
    waitingForHost: false,
    currentRound: 1,
    totalRounds: 4,
    gameComplete: false,
    ...overrides,
  };
}

describe('generateUniqueCode', () => {
  it('returns an uppercase code of at most 6 characters', () => {
    const code = generateUniqueCode();
    expect(code).toBe(code.toUpperCase());
    expect(code.length).toBeGreaterThan(0);
    expect(code.length).toBeLessThanOrEqual(6);
  });

  it('produces different codes across calls', () => {
    // Drive Math.random so the two calls can't collide by chance.
    const spy = vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.123456789)
      .mockReturnValueOnce(0.987654321);
    expect(generateUniqueCode()).not.toBe(generateUniqueCode());
    spy.mockRestore();
  });
});

describe('startCountdown', () => {
  it('sets countdown and round-end timestamps relative to now', () => {
    const game = makeGame();
    startCountdown(game);
    expect(game.countdownEndsAt).toBe(NOW + 5000);
    expect(game.roundEndsAt).toBe(NOW + 5000 + 60 * 1000);
  });

  it('respects a custom round duration', () => {
    const game = makeGame({ roundDuration: 90 });
    startCountdown(game);
    expect(game.roundEndsAt).toBe(NOW + 5000 + 90 * 1000);
  });

  it('does not restart a countdown that is already running', () => {
    const game = makeGame({ countdownEndsAt: NOW + 1234, roundEndsAt: NOW + 9999 });
    startCountdown(game);
    expect(game.countdownEndsAt).toBe(NOW + 1234);
    expect(game.roundEndsAt).toBe(NOW + 9999);
  });
});

describe('updateGameState — countdown completion', () => {
  it('activates the round once the countdown elapses', () => {
    const game = makeGame({ countdownEndsAt: NOW });
    updateGameState(game);
    expect(game.gameStarted).toBe(true);
    expect(game.roundActive).toBe(true);
    expect(game.countdownEndsAt).toBeNull();
  });

  it('leaves the round inactive while the countdown is still running', () => {
    const game = makeGame({ countdownEndsAt: NOW + 1000 });
    updateGameState(game);
    expect(game.roundActive).toBe(false);
    expect(game.gameStarted).toBe(false);
    expect(game.countdownEndsAt).toBe(NOW + 1000);
  });
});

describe('updateGameState — round end', () => {
  it('ends the round, waits for host, and clears ready flags', () => {
    const game = makeGame({
      gameStarted: true,
      roundActive: true,
      roundEndsAt: NOW,
      teams: [
        { name: 'Team A', score: 3, ready: true },
        { name: 'Team B', score: 1, ready: true },
      ],
    });
    updateGameState(game);
    expect(game.roundActive).toBe(false);
    expect(game.waitingForHost).toBe(true);
    expect(game.roundEndsAt).toBeNull();
    expect(game.teams.every((t) => t.ready === false)).toBe(true);
  });

  it('does not end the round before its end time', () => {
    const game = makeGame({
      gameStarted: true,
      roundActive: true,
      roundEndsAt: NOW + 1,
    });
    updateGameState(game);
    expect(game.roundActive).toBe(true);
    expect(game.waitingForHost).toBe(false);
  });
});

describe('updateGameState — auto-countdown for subsequent rounds', () => {
  it('starts a countdown once all teams are ready between rounds', () => {
    const game = makeGame({
      gameStarted: true,
      waitingForHost: false,
      roundActive: false,
      roundEndsAt: null,
      countdownEndsAt: null,
      teams: [
        { name: 'Team A', score: 0, ready: true },
        { name: 'Team B', score: 0, ready: true },
      ],
    });
    updateGameState(game);
    expect(game.countdownEndsAt).toBe(NOW + 5000);
  });

  it('does not start a countdown while still waiting for the host', () => {
    const game = makeGame({
      gameStarted: true,
      waitingForHost: true,
      teams: [
        { name: 'Team A', score: 0, ready: true },
        { name: 'Team B', score: 0, ready: true },
      ],
    });
    updateGameState(game);
    expect(game.countdownEndsAt).toBeNull();
  });

  it('does not start a countdown until every team is ready', () => {
    const game = makeGame({
      gameStarted: true,
      teams: [
        { name: 'Team A', score: 0, ready: true },
        { name: 'Team B', score: 0, ready: false },
      ],
    });
    updateGameState(game);
    expect(game.countdownEndsAt).toBeNull();
  });
});

describe('getTimeLeft', () => {
  it('returns the full duration when no round is scheduled', () => {
    expect(getTimeLeft(makeGame({ roundDuration: 45, roundEndsAt: null }))).toBe(45);
  });

  it('rounds remaining time up to whole seconds', () => {
    expect(getTimeLeft(makeGame({ roundEndsAt: NOW + 4200 }))).toBe(5);
  });

  it('never returns a negative value once the round is over', () => {
    expect(getTimeLeft(makeGame({ roundEndsAt: NOW - 3000 }))).toBe(0);
  });
});

describe('getCountdown', () => {
  it('returns 0 when no countdown is active', () => {
    expect(getCountdown(makeGame({ countdownEndsAt: null }))).toBe(0);
  });

  it('rounds remaining countdown up to whole seconds', () => {
    expect(getCountdown(makeGame({ countdownEndsAt: NOW + 2100 }))).toBe(3);
  });

  it('clamps to 0 once elapsed', () => {
    expect(getCountdown(makeGame({ countdownEndsAt: NOW - 500 }))).toBe(0);
  });

  it('returns 0 when countdownEndsAt is missing (not just null)', () => {
    const game = makeGame();
    delete game.countdownEndsAt;
    expect(getCountdown(game)).toBe(0);
  });
});

describe('getWinner', () => {
  it('reports a single winner with the top score', () => {
    const game = makeGame({
      teams: [
        { name: 'Team A', score: 5 },
        { name: 'Team B', score: 2 },
      ],
    });
    expect(getWinner(game)).toEqual({ tie: false, team: 'Team A', score: 5 });
  });

  it('does not mutate the original team ordering', () => {
    const game = makeGame({
      teams: [
        { name: 'Team A', score: 2 },
        { name: 'Team B', score: 9 },
      ],
    });
    getWinner(game);
    expect(game.teams[0].name).toBe('Team A');
    expect(game.teams[1].name).toBe('Team B');
  });

  it('reports a tie between the teams sharing the top score', () => {
    const game = makeGame({
      teams: [
        { name: 'Team A', score: 4 },
        { name: 'Team B', score: 4 },
        { name: 'Team C', score: 1 },
      ],
    });
    expect(getWinner(game)).toEqual({ tie: true, teams: ['Team A', 'Team B'] });
  });

  it('handles a single-team game without throwing', () => {
    const game = makeGame({ teams: [{ name: 'Solo', score: 3 }] });
    expect(getWinner(game)).toEqual({ tie: false, team: 'Solo', score: 3 });
  });

  it('picks the top team even when teams are not already in score order', () => {
    // game.teams is in join order, never sorted — getWinner must do the sorting.
    const game = makeGame({
      teams: [
        { name: 'Team A', score: 1 },
        { name: 'Team B', score: 9 },
        { name: 'Team C', score: 5 },
      ],
    });
    expect(getWinner(game)).toEqual({ tie: false, team: 'Team B', score: 9 });
  });
});

describe('full round lifecycle', () => {
  it('transitions setup → countdown → active → round-over via timestamps', () => {
    const game = makeGame({
      teams: [
        { name: 'Team A', score: 0, ready: true },
        { name: 'Team B', score: 0, ready: true },
      ],
    });

    // All ready at setup → host/ready flow starts the countdown.
    startCountdown(game);
    expect(getCountdown(game)).toBe(5);

    // Countdown elapses → round goes active.
    vi.setSystemTime(NOW + 5000);
    updateGameState(game);
    expect(game.roundActive).toBe(true);
    expect(game.gameStarted).toBe(true);

    // Round timer runs out → round over, waiting for host.
    vi.setSystemTime(NOW + 5000 + 60_000);
    updateGameState(game);
    expect(game.roundActive).toBe(false);
    expect(game.waitingForHost).toBe(true);
    expect(game.teams.every((t) => !t.ready)).toBe(true);
  });
});
