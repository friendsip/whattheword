import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import confetti from 'canvas-confetti';
import { useSound } from './hooks/useSound';
import { pollDelay } from './pollDelay';
import './Player.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function Player() {
  const { gameId, teamIndex } = useParams();
  const { play, muted, toggleMute } = useSound();
  const [gameState, setGameState] = useState({
    currentWord: '',
    score: 0,
    roundActive: false,
    timeLeft: 60,
    roundDuration: 60,
    roundEndsAt: null,
    countdownEndsAt: null,
    gameStarted: false,
    ready: false,
    countdown: 0,
    allTeamsReady: false,
    currentRound: 1,
    totalRounds: 4,
    gameComplete: false,
    waitingForHost: false,
    genre: '',
    teamName: '',
    roundHistory: [],
    allTeams: [],
    teamsReadyStatus: [],
  });
  const [error, setError] = useState(null);
  const [lastAction, setLastAction] = useState(null); // 'correct' | 'skip' | null
  const [wordAnim, setWordAnim] = useState(''); // '' | 'exit' | 'enter'
  const [displayWord, setDisplayWord] = useState('');
  const [localTimeLeft, setLocalTimeLeft] = useState(null);
  const [lastCountdown, setLastCountdown] = useState(null);
  const prevWordRef = useRef('');
  const wakeLockRef = useRef(null);

  const fetchGameState = useCallback(async () => {
    try {
      const response = await axios.get(
        `/api/games/${gameId}/team/${teamIndex}`
      );
      setGameState(response.data);
      return response.data;
    } catch (err) {
      setError('Failed to fetch game state.');
      return null;
    }
  }, [gameId, teamIndex]);

  // Adaptive poll: fast while play is live, relaxed otherwise (see pollDelay)
  useEffect(() => {
    let timer;
    let cancelled = false;
    const loop = async () => {
      const game = await fetchGameState();
      if (cancelled) return;
      timer = setTimeout(loop, pollDelay(game));
    };
    loop();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fetchGameState]);

  // Client-side timer from roundEndsAt for smooth countdown
  const lastTickRef = useRef(null);
  useEffect(() => {
    if (!gameState.roundActive || !gameState.roundEndsAt) {
      setLocalTimeLeft(null);
      lastTickRef.current = null;
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((gameState.roundEndsAt - Date.now()) / 1000));
      setLocalTimeLeft(remaining);
      // Tick sound in last 5 seconds
      if (remaining <= 5 && remaining > 0 && remaining !== lastTickRef.current) {
        play('tick');
        lastTickRef.current = remaining;
      }
    };
    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [gameState.roundActive, gameState.roundEndsAt, play]);

  // Client-side countdown from countdownEndsAt
  useEffect(() => {
    if (!gameState.countdownEndsAt) {
      setLastCountdown(null);
      return;
    }
    let lastPlayed = null;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((gameState.countdownEndsAt - Date.now()) / 1000));
      setLastCountdown(remaining);
      // Sound: beep on each countdown second, go at 0
      if (remaining !== lastPlayed && remaining > 0 && remaining <= 5) {
        play('beep');
        lastPlayed = remaining;
      }
      if (remaining === 0 && lastPlayed !== 0) {
        play('go');
        lastPlayed = 0;
      }
    };
    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [gameState.countdownEndsAt, play]);

  // Word change animation
  useEffect(() => {
    // No active word (round ended / not started) — reset so the next round's
    // first word enters fresh instead of animating from a stale previous word
    if (!gameState.currentWord) {
      prevWordRef.current = '';
      setDisplayWord('');
      setWordAnim('');
      return;
    }
    if (gameState.currentWord !== prevWordRef.current) {
      if (prevWordRef.current) {
        setWordAnim('exit');
        const timeout = setTimeout(() => {
          setDisplayWord(gameState.currentWord);
          setWordAnim('enter');
          setTimeout(() => setWordAnim(''), 150);
        }, 150);
        prevWordRef.current = gameState.currentWord;
        return () => clearTimeout(timeout);
      } else {
        setDisplayWord(gameState.currentWord);
        prevWordRef.current = gameState.currentWord;
      }
    }
  }, [gameState.currentWord]);

  // Winning (or drawing) teams get their own celebration, not just the host
  const gameOverCelebratedRef = useRef(false);
  useEffect(() => {
    if (!gameState.gameComplete || gameOverCelebratedRef.current) return;
    const allTeams = gameState.allTeams || [];
    if (allTeams.length === 0) return;
    gameOverCelebratedRef.current = true;
    const topScore = Math.max(...allTeams.map(t => t.score));
    if (gameState.score >= topScore) {
      play('victory');
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#D96A47', '#3A9E8F', '#E8B33C', '#8E6BAE'],
      });
    }
  }, [gameState.gameComplete, gameState.allTeams, gameState.score, play]);

  // Wake lock during active rounds
  useEffect(() => {
    if (gameState.roundActive && navigator.wakeLock) {
      navigator.wakeLock.request('screen').then(lock => {
        wakeLockRef.current = lock;
      }).catch(() => {});
    }
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [gameState.roundActive]);

  const handleReady = async () => {
    try {
      await axios.post(`${API_URL}/api/games/${gameId}/team/${teamIndex}/ready`);
      fetchGameState();
    } catch (err) {
      setError('Failed to indicate readiness.');
    }
  };

  const handleGuess = async (correct) => {
    try {
      // Trigger flash feedback
      setLastAction(correct ? 'correct' : 'skip');
      setTimeout(() => setLastAction(null), 350);

      // Sound + haptic feedback
      play(correct ? 'correct' : 'skip');
      if (correct && navigator.vibrate) {
        navigator.vibrate(50);
      }

      const response = await axios.post(
        `${API_URL}/api/games/${gameId}/team/${teamIndex}/guess`,
        { correct }
      );
      setGameState(response.data);
    } catch (err) {
      setError('Failed to submit guess.');
    }
  };

  const timeLeft = localTimeLeft !== null ? localTimeLeft : gameState.timeLeft;
  const totalTime = gameState.roundDuration || 60;
  const countdown = lastCountdown !== null ? lastCountdown : gameState.countdown;

  // Timer urgency
  const getUrgency = () => {
    if (timeLeft <= 5) return 'critical';
    if (timeLeft <= 10) return 'warning';
    return 'normal';
  };

  // Timer fill fraction (word is the hero; the timer is a slim bar below it)
  const progress = gameState.roundActive ? timeLeft / totalTime : 1;
  const urgency = getUrgency();

  // The word is displayed large; only very long words step down, never below legible
  const activeWord = displayWord || gameState.currentWord || '';
  const wordSizeClass =
    activeWord.length > 22 ? 'word-xxlong' :
    activeWord.length > 14 ? 'word-xlong' :
    activeWord.length > 9 ? 'word-long' : '';

  // Countdown colors
  const countdownColor = (n) => {
    const colors = { 5: '#3A9E8F', 4: '#5D9FC7', 3: '#E8B33C', 2: '#E8965A', 1: '#D64545' };
    return colors[n] || 'var(--accent-blue)';
  };

  // Render round recap
  const renderRoundRecap = () => {
    const history = gameState.roundHistory;
    if (!history || history.length === 0) return null;

    const correct = history.filter(h => h.result === 'correct').length;
    const skipped = history.filter(h => h.result === 'skipped').length;

    return (
      <div className="round-recap">
        <h3>Round Recap</h3>
        <div className="recap-summary">
          <div className="recap-count correct">
            <span>&#10003;</span> {correct}
          </div>
          <div className="recap-count skipped">
            <span>&#10007;</span> {skipped}
          </div>
        </div>
        <ul className="recap-word-list">
          {history.map((item, i) => (
            <li key={i} className="recap-word-item">
              <span className={`recap-icon ${item.result}`}>
                {item.result === 'correct' ? '\u2713' : '\u2717'}
              </span>
              {item.word}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // Render team ready status — full names, so nobody has to decode initials
  const renderTeamReadyStatus = () => {
    const teams = gameState.teamsReadyStatus;
    if (!teams || teams.length === 0) return null;

    return (
      <div className="team-ready-list">
        {teams.map((t, i) => (
          <div key={i} className={`team-ready-row ${t.ready ? 'ready' : ''}`}>
            <span
              className="team-ready-swatch"
              style={{ backgroundColor: `var(--team-${i + 1})` }}
            />
            <span className="team-ready-name">{t.name}</span>
            <span className="team-ready-state">
              {t.ready ? '✓ Ready' : 'Waiting…'}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // === GAME COMPLETE ===
  if (gameState.gameComplete) {
    const allTeams = gameState.allTeams || [];
    const sorted = [...allTeams].sort((a, b) => b.score - a.score);

    return (
      <div className="player-container game-over no-buttons">
        {error && <div className="error">{error}</div>}
        <h2 className="game-over-title">Game Over!</h2>
        <div className="score-badge">{gameState.teamName}: {gameState.score} pts</div>
        {sorted.length > 0 && (
          <div className="final-leaderboard">
            {sorted.map((team, i) => (
              <div
                key={i}
                className={`final-leaderboard-item ${team.name === gameState.teamName ? 'current-team' : ''}`}
              >
                <span className={`placement-badge ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'other'}`}>
                  {i + 1}
                </span>
                <span className="final-leaderboard-name">{team.name}</span>
                <span className="final-leaderboard-score">{team.score} pts</span>
              </div>
            ))}
          </div>
        )}
        {(!allTeams || allTeams.length === 0) && (
          <p className="waiting-text">Check the host's screen for final results!</p>
        )}
        {renderRoundRecap()}
      </div>
    );
  }

  // === COUNTDOWN OVERLAY ===
  if (countdown > 0) {
    return (
      <div className="countdown-overlay">
        <div
          className="countdown-number"
          key={countdown}
          style={{ color: countdownColor(countdown) }}
        >
          {countdown}
        </div>
      </div>
    );
  }

  // === PRE-GAME (not started) ===
  if (!gameState.gameStarted) {
    return (
      <div className="player-container no-buttons">
        {error && <div className="error">{error}</div>}
        <h2>{gameState.teamName || `Team ${parseInt(teamIndex) + 1}`}</h2>
        {gameState.genre && (
          <p className="genre-display">Category: <strong>{gameState.genre}</strong></p>
        )}
        <div className="game-info-chips">
          <span className="info-chip">{gameState.totalRounds} rounds</span>
          <span className="info-chip">{gameState.roundDuration}s per round</span>
        </div>
        <div className="how-to-hint">
          <p>One of you <strong>describes</strong> the word on screen — without
          saying it! Your partner <strong>guesses</strong>.</p>
          <p>Tap <span className="hint-got-it">Got it!</span> for every correct
          guess, or <span className="hint-skip">Skip</span> to move on. Swap
          roles each round.</p>
        </div>
        {renderTeamReadyStatus()}
        {!gameState.ready ? (
          <button onClick={handleReady} className="ready-button">We're Ready!</button>
        ) : gameState.allTeamsReady ? (
          <div className="all-ready-flash">ALL READY!</div>
        ) : (
          <p className="waiting-text">
            Waiting for other teams
            <span className="waiting-dots">
              <span></span><span></span><span></span>
            </span>
          </p>
        )}
      </div>
    );
  }

  // === ROUND ENDED — waiting for host ===
  if (!gameState.roundActive && gameState.waitingForHost) {
    return (
      <div className="player-container no-buttons">
        <h2>Round {gameState.currentRound} of {gameState.totalRounds} complete!</h2>
        <div className="score-badge">Score: {gameState.score}</div>
        {renderRoundRecap()}
        <p className="waiting-text">
          Waiting for the host
          <span className="waiting-dots">
            <span></span><span></span><span></span>
          </span>
        </p>
      </div>
    );
  }

  // === BETWEEN ROUNDS — ready up ===
  if (!gameState.roundActive && !gameState.ready) {
    return (
      <div className="player-container no-buttons">
        <h2>Get ready for Round {gameState.currentRound}!</h2>
        <div className="score-badge">Score: {gameState.score}</div>
        {renderTeamReadyStatus()}
        <button onClick={handleReady} className="ready-button">We're Ready!</button>
      </div>
    );
  }

  if (!gameState.roundActive && gameState.ready) {
    return (
      <div className="player-container no-buttons">
        <div className="round-pill">Round {gameState.currentRound} of {gameState.totalRounds}</div>
        <div className="score-badge">Score: {gameState.score}</div>
        {renderTeamReadyStatus()}
        {gameState.allTeamsReady ? (
          <div className="all-ready-flash">ALL READY!</div>
        ) : (
          <p className="waiting-text">
            Waiting for other teams
            <span className="waiting-dots">
              <span></span><span></span><span></span>
            </span>
          </p>
        )}
      </div>
    );
  }

  // === ACTIVE ROUND ===
  return (
    <div className="player-container">
      {error && <div className="error">{error}</div>}

      {/* Mute toggle */}
      <button className="mute-button" onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}>
        {muted ? '\uD83D\uDD07' : '\uD83D\uDD0A'}
      </button>

      {/* Flash overlay */}
      {lastAction && (
        <div className={`flash-overlay ${lastAction}`} key={Date.now()} />
      )}

      <div className="round-pill">
        Round {gameState.currentRound}/{gameState.totalRounds}
        <span style={{ margin: '0 4px', opacity: 0.4 }}>|</span>
        {gameState.genre}
      </div>

      {/* The word — the hero of the screen */}
      <div className="word-stage">
        <div className={`word-hero ${wordAnim} ${wordSizeClass}`}>
          {activeWord}
        </div>
      </div>

      {/* Timer — a slim draining bar with a bold countdown */}
      <div className={`round-timer ${urgency}`}>
        <div className="round-timer-seconds">{timeLeft}s</div>
        <div className="round-timer-track">
          <div
            className="round-timer-fill"
            style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
          />
        </div>
      </div>

      <div className="score-badge">Score: {gameState.score}</div>

      <div className="guess-buttons">
        <button onClick={() => handleGuess(false)} className="wrong-button">
          Skip
        </button>
        <button onClick={() => handleGuess(true)} className="right-button">
          Got it!
        </button>
      </div>
    </div>
  );
}

export default Player;
