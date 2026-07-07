import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { useSound } from './hooks/useSound';
import './GameSetup.css';

const API_URL = process.env.REACT_APP_API_URL || '';

// Preset categories shown as a tappable grid. Educational picks come first
// so the classroom use is obvious; the party categories follow.
const CATEGORY_OPTIONS = [
  { value: 'General', label: 'General', emoji: '🎲' },
  { value: 'Shakespeare', label: 'Shakespeare', emoji: '🎭' },
  { value: 'Science', label: 'Science', emoji: '🔬' },
  { value: 'Animals', label: 'Animals', emoji: '🐘' },
  { value: 'Geography', label: 'Geography', emoji: '🌍' },
  { value: 'Movies', label: 'Movies', emoji: '🎬' },
  { value: 'Pop Music', label: 'Pop Music', emoji: '🎵' },
  { value: 'Christmas', label: 'Christmas', emoji: '🎄' },
  { value: 'Friends TV Show', label: 'Friends', emoji: '☕' },
  { value: 'The Bible', label: 'The Bible', emoji: '📖' },
  { value: 'US Politics', label: 'US Politics', emoji: '🇺🇸' },
  { value: 'UK Politics', label: 'UK Politics', emoji: '🇬🇧' },
];

// "Bring your own" options — a free-text topic or a hand-typed word list.
const CUSTOM_OPTIONS = [
  { value: 'Custom', label: 'Custom Topic', emoji: '✏️' },
  { value: 'CustomList', label: 'Your Word List', emoji: '📝' },
];

const DIFFICULTY_HINTS = {
  easy: 'Simple, everyday words',
  medium: 'A good mix',
  hard: 'Challenging & abstract',
};

const TEAM_COLORS = [
  '#6c5ce7', '#00b894', '#ff6b6b', '#ffd93d', '#0984e3',
  '#e17055', '#00cec9', '#fd79a8', '#636e72', '#a29bfe',
];

function GameSetup() {
  const [numTeams, setNumTeams] = useState(2);
  const [numRounds, setNumRounds] = useState(2);
  const [roundDuration, setRoundDuration] = useState(30);
  const [genre, setGenre] = useState('General');
  const [customGenre, setCustomGenre] = useState('');
  const [customWords, setCustomWords] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [teams, setTeams] = useState([
    { name: 'Team A' },
    { name: 'Team B' },
  ]);
  const [gameCreated, setGameCreated] = useState(false);
  const [gameCode, setGameCode] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState(null);
  const [showRules, setShowRules] = useState(false);
  const [restartGenre, setRestartGenre] = useState('General');
  const [restartCustomGenre, setRestartCustomGenre] = useState('');
  const [celebrationFired, setCelebrationFired] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(null); // null = auto (open until game starts)
  const { play, muted, toggleMute } = useSound();

  const inviteExpanded = inviteOpen !== null ? inviteOpen : !gameState?.gameStarted;

  const handleNumTeamsChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setNumTeams(value);
    const newTeams = Array.from({ length: value }, (_, i) => ({
      name: `Team ${String.fromCharCode(65 + i)}`,
    }));
    setTeams(newTeams);
  };

  const handleTeamNameChange = (index, name) => {
    const newTeams = [...teams];
    newTeams[index].name = name;
    setTeams(newTeams);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const body = {
        teams,
        totalRounds: numRounds,
        roundDuration,
        difficulty,
      };

      if (genre === 'CustomList') {
        const wordArray = customWords
          .split('\n')
          .map(w => w.trim())
          .filter(w => w.length > 0);
        if (wordArray.length < 5) {
          setError('Please provide at least 5 words.');
          return;
        }
        body.customWords = wordArray;
        body.genre = 'Custom Words';
      } else if (genre === 'Custom') {
        if (!customGenre.trim()) {
          setError('Please enter a custom category.');
          return;
        }
        body.genre = customGenre;
      } else {
        body.genre = genre;
      }

      const response = await axios.post(`/api/games`, body);
      setGameCode(response.data.gameId);
      setGameCreated(true);
    } catch (err) {
      console.error('Error creating game:', err);
      setError('Failed to create game. Please try again.');
    }
  };

  const fetchGameState = useCallback(async () => {
    if (!gameCode) return;
    try {
      const response = await axios.get(`${API_URL}/api/games/${gameCode}`);
      setGameState(response.data);
    } catch (err) {
      setError('Failed to fetch game state');
    }
  }, [gameCode]);

  useEffect(() => {
    if (gameCreated) {
      fetchGameState();
      const interval = setInterval(fetchGameState, 1000);
      return () => clearInterval(interval);
    }
  }, [gameCreated, fetchGameState]);

  // Games built on a custom word list default to replaying the same list
  useEffect(() => {
    if (gameState?.gameComplete && gameState.genre === 'Custom Words') {
      setRestartGenre('Custom Words');
    }
  }, [gameState?.gameComplete, gameState?.genre]);

  // Fire celebration confetti + sound on game complete
  useEffect(() => {
    if (gameState?.gameComplete && !celebrationFired) {
      setCelebrationFired(true);
      play('victory');
      const duration = 3000;
      const end = Date.now() + duration;
      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#6c5ce7', '#00b894', '#ffd93d', '#ff6b6b'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#6c5ce7', '#00b894', '#ffd93d', '#ff6b6b'],
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, [gameState?.gameComplete, celebrationFired, play]);

  const getTeamUrl = (teamIndex) => {
    return `${window.location.origin}/game/${gameCode}/team/${teamIndex}`;
  };

  const getJoinUrl = () => {
    return `${window.location.origin}/join/${gameCode}`;
  };

  const getSpectatorUrl = () => {
    return `${window.location.origin}/game/${gameCode}/spectate`;
  };

  const shareGame = (teamIndex, platform) => {
    const teamUrl = getTeamUrl(teamIndex);
    const message = `Join our What the Word game! Click here: ${teamUrl}`;
    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
        break;
      case 'sms':
        window.open(`sms:?body=${encodeURIComponent(message)}`, '_blank');
        break;
      default:
        navigator.clipboard.writeText(teamUrl);
        alert('Link copied!');
    }
  };

  const handleShare = async () => {
    const url = getJoinUrl();
    const text = `Join our What the Word game!\nGame code: ${gameCode}\n${url}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'What the Word?!', text, url });
      } catch (e) {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(text);
      alert('Game info copied!');
    }
  };

  const handleStartNextRound = async () => {
    try {
      await axios.post(`${API_URL}/api/games/${gameCode}/nextround`);
      fetchGameState();
    } catch (err) {
      setError('Failed to start next round');
    }
  };

  const handleRestartGame = async () => {
    try {
      const selectedGenre = restartGenre === 'Custom' ? restartCustomGenre : restartGenre;
      await axios.post(`${API_URL}/api/games/${gameCode}/restart`, {
        genre: selectedGenre,
      });
      setCelebrationFired(false);
      fetchGameState();
    } catch (err) {
      setError('Failed to restart game');
    }
  };

  const handleDownloadResults = () => {
    if (!gameState) return;
    const rows = [['Team', 'Score', 'Words Correct', 'Words Skipped']];
    gameState.teams.forEach(team => {
      const history = team.roundHistory || [];
      const correct = history.filter(h => h.result === 'correct').length;
      const skipped = history.filter(h => h.result === 'skipped').length;
      rows.push([team.name, team.score, correct, skipped]);
    });
    rows.push([]);
    rows.push(['Team', 'Word', 'Result']);
    gameState.teams.forEach(team => {
      (team.roundHistory || []).forEach(h => {
        rows.push([team.name, h.word, h.result]);
      });
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wtw-results-${gameCode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getWordCount = () => {
    return customWords.split('\n').map(w => w.trim()).filter(w => w.length > 0).length;
  };

  // ===== Scoreboard Rendering =====
  const renderScoreboard = () => {
    if (!gameState) return null;

    const sortedTeams = [...gameState.teams].sort((a, b) => b.score - a.score);
    const maxScore = Math.max(...gameState.teams.map(t => t.score), 1);

    if (gameState.gameComplete) {
      const winner = sortedTeams[0];
      const isTie = sortedTeams.filter(t => t.score === winner.score).length > 1;

      return (
        <div className="scoreboard game-over">
          <h2>Game Over!</h2>
          {isTie ? (
            <p className="winner-announcement">
              It's a tie between {sortedTeams.filter(t => t.score === winner.score).map(t => t.name).join(' & ')}!
            </p>
          ) : (
            <p className="winner-announcement">{winner.name} wins!</p>
          )}

          <div className="scores">
            {sortedTeams.map((team, index) => {
              const originalIndex = gameState.teams.findIndex(t => t.name === team.name);
              return (
                <div key={team.name} className="team-score">
                  <span className={`placement-badge ${index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : 'other'}`}>
                    {index + 1}
                  </span>
                  <div className="team-score-bar-wrapper">
                    <div className="team-score-header">
                      <span className="team-name">{team.name}</span>
                      <span className="team-points">{team.score} pts</span>
                    </div>
                    <div className="team-score-bar">
                      <div
                        className="team-score-bar-fill"
                        style={{
                          width: `${(team.score / maxScore) * 100}%`,
                          backgroundColor: TEAM_COLORS[originalIndex % TEAM_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={handleDownloadResults} className="download-button">
            Download Results (CSV)
          </button>

          <div className="restart-section">
            <h3>Play Again?</h3>
            <div className="restart-genre-selection">
              <label htmlFor="restartGenre">Choose a new category:</label>
              <select
                id="restartGenre"
                value={restartGenre}
                onChange={(e) => setRestartGenre(e.target.value)}
                className="genre-select"
              >
                {[
                  ...(gameState.genre === 'Custom Words'
                    ? [{ value: 'Custom Words', label: 'Same Word List', emoji: '📝' }]
                    : []),
                  ...CATEGORY_OPTIONS,
                  { value: 'Custom', label: 'Custom Topic', emoji: '✏️' },
                ].map((g) => (
                  <option key={g.value} value={g.value}>{g.emoji} {g.label}</option>
                ))}
              </select>
            </div>
            {restartGenre === 'Custom' && (
              <div className="restart-custom-genre">
                <input
                  type="text"
                  value={restartCustomGenre}
                  onChange={(e) => setRestartCustomGenre(e.target.value)}
                  placeholder="Enter custom category..."
                />
              </div>
            )}
            <button onClick={handleRestartGame} className="restart-button">
              New Game with Same Teams
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="scoreboard">
        <h2>Scoreboard</h2>
        <p className="round-info">Round {gameState.currentRound} of {gameState.totalRounds}</p>

        <div className="scores">
          {sortedTeams.map((team) => {
            const originalIndex = gameState.teams.findIndex(t => t.name === team.name);
            return (
              <div key={team.name} className="team-score">
                <div className="team-score-bar-wrapper">
                  <div className="team-score-header">
                    <span className="team-name">{team.name}</span>
                    <span className="team-points">{team.score} pts</span>
                  </div>
                  <div className="team-score-bar">
                    <div
                      className="team-score-bar-fill"
                      style={{
                        width: `${maxScore > 0 ? (team.score / maxScore) * 100 : 0}%`,
                        backgroundColor: TEAM_COLORS[originalIndex % TEAM_COLORS.length],
                      }}
                    />
                  </div>
                </div>
                <span className={`team-status ${team.ready ? 'ready' : ''}`}>
                  {team.ready ? 'Ready' : 'Not Ready'}
                </span>
              </div>
            );
          })}
        </div>

        {/* The host's next action comes right after the scores, before any recap */}
        <div className={`game-status ${gameState.waitingForHost ? 'action-needed' : ''}`}>
          {gameState.roundActive ? (
            <div className="round-in-progress">
              <span className="pulse-dot" />
              Round {gameState.currentRound} in progress — {gameState.timeLeft}s
            </div>
          ) : gameState.waitingForHost ? (
            gameState.currentRound < gameState.totalRounds ? (
              <button onClick={handleStartNextRound} className="next-round-button primary-cta">
                Start Round {gameState.currentRound + 1}
              </button>
            ) : (
              <button onClick={handleStartNextRound} className="next-round-button primary-cta">
                End Game & See Results
              </button>
            )
          ) : gameState.gameStarted ? (
            `Waiting for teams to ready up for Round ${gameState.currentRound}`
          ) : (
            'Waiting for teams to ready up'
          )}
        </div>

        {/* Round recap for host */}
        {gameState.waitingForHost && gameState.teams.some(t => (t.roundHistory || []).length > 0) && (
          <div className="round-recap-host">
            <h4>Round Summary</h4>
            {gameState.teams.map((team, i) => {
              const history = team.roundHistory || [];
              const correct = history.filter(h => h.result === 'correct').length;
              const skipped = history.filter(h => h.result === 'skipped').length;
              if (history.length === 0) return null;
              return (
                <div key={i} className="recap-team">
                  <div className="recap-team-name">{team.name}</div>
                  <div className="recap-stats">
                    <span className="recap-correct">{correct} correct</span>
                    <span className="recap-skipped">{skipped} skipped</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="game-setup-container">
      {gameCreated && (
        <button className="mute-button" onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}>
          {muted ? '\uD83D\uDD07' : '\uD83D\uDD0A'}
        </button>
      )}
      <h1>What the Word?!</h1>
      {error && <div className="error">{error}</div>}
      {gameCreated && renderScoreboard()}
      {!gameCreated ? (
        <form onSubmit={handleSubmit}>
          <div className="game-intro">
            <p>A fun, rapid-fire word guessing game.</p>
            <button
              type="button"
              className="rules-button"
              onClick={() => setShowRules(!showRules)}
            >
              {showRules ? 'Hide Rules' : 'How to play'}
            </button>

            {showRules && (
              <div className="rules-section">
                <p>Split into teams of two. One partner describes the word on screen
                without saying it. Their partner guesses. Score a point for each correct guess!</p>
                <p>At the end of each round, you swap roles. The team with the most points wins!</p>
              </div>
            )}

            {/* Category — the star choice, shown as a tappable grid */}
            <div className="setup-section">
              <span className="setup-label">Choose a category</span>
              <div className="category-grid">
                {CATEGORY_OPTIONS.map((g) => (
                  <button
                    type="button"
                    key={g.value}
                    className={`category-card ${genre === g.value ? 'selected' : ''}`}
                    onClick={() => setGenre(g.value)}
                    aria-pressed={genre === g.value}
                  >
                    <span className="cat-emoji">{g.emoji}</span>
                    <span className="cat-label">{g.label}</span>
                  </button>
                ))}
              </div>
              <div className="category-grid custom-cards">
                {CUSTOM_OPTIONS.map((g) => (
                  <button
                    type="button"
                    key={g.value}
                    className={`category-card custom-card ${genre === g.value ? 'selected' : ''}`}
                    onClick={() => setGenre(g.value)}
                    aria-pressed={genre === g.value}
                  >
                    <span className="cat-emoji">{g.emoji}</span>
                    <span className="cat-label">{g.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {genre === 'Custom' && (
              <div className="custom-genre">
                <label htmlFor="customGenre">Enter your topic:</label>
                <input
                  type="text"
                  id="customGenre"
                  value={customGenre}
                  onChange={(e) => setCustomGenre(e.target.value)}
                  placeholder="e.g., Harry Potter, 80s Movies, Sports"
                />
              </div>
            )}

            {genre === 'CustomList' && (
              <div className="custom-genre custom-wordlist">
                <label htmlFor="customWords">Enter your words (one per line):</label>
                <textarea
                  id="customWords"
                  value={customWords}
                  onChange={(e) => setCustomWords(e.target.value)}
                  placeholder={"BANANA\nELEPHANT\nGUITAR\nHOSPITAL\nKITCHEN"}
                  rows={6}
                />
                <div className="word-count">{getWordCount()} words (minimum 5)</div>
              </div>
            )}

            {/* Game settings — compact, secondary to the category choice */}
            <div className="setup-section">
              <span className="setup-label">Game settings</span>
              <div className="settings-row">
                <div className="team-selection">
                  <label htmlFor="numTeams">Teams</label>
                  <select
                    id="numTeams"
                    value={numTeams}
                    onChange={handleNumTeamsChange}
                    required
                    className="team-select"
                  >
                    {[...Array(9)].map((_, i) => (
                      <option key={i} value={i + 2}>{i + 2}</option>
                    ))}
                  </select>
                </div>

                <div className="rounds-selection">
                  <label htmlFor="numRounds">Rounds</label>
                  <select
                    id="numRounds"
                    value={numRounds}
                    onChange={(e) => setNumRounds(parseInt(e.target.value, 10))}
                    required
                    className="rounds-select"
                  >
                    {[2, 4, 6, 8, 10].map((rounds) => (
                      <option key={rounds} value={rounds}>{rounds}</option>
                    ))}
                  </select>
                </div>

                <div className="duration-selection">
                  <label htmlFor="roundDuration">Seconds</label>
                  <select
                    id="roundDuration"
                    value={roundDuration}
                    onChange={(e) => setRoundDuration(parseInt(e.target.value, 10))}
                    required
                    className="duration-select"
                  >
                    {[30, 45, 60, 90, 120, 180].map((seconds) => (
                      <option key={seconds} value={seconds}>{seconds}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="difficulty-selection">
                <label>Difficulty</label>
                <div className="segmented" role="group" aria-label="Difficulty">
                  {['easy', 'medium', 'hard'].map((val) => (
                    <button
                      type="button"
                      key={val}
                      className={`segmented-option ${difficulty === val ? 'active' : ''}`}
                      onClick={() => setDifficulty(val)}
                      aria-pressed={difficulty === val}
                    >
                      {val.charAt(0).toUpperCase() + val.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="difficulty-hint">{DIFFICULTY_HINTS[difficulty]}</div>
              </div>
            </div>
          </div>

          {teams.map((team, index) => (
            <div key={index}>
              <label>
                Team {index + 1} Name:
                <input
                  type="text"
                  value={team.name}
                  onChange={(e) => handleTeamNameChange(index, e.target.value)}
                  required
                />
              </label>
            </div>
          ))}
          <button type="submit">Create Game</button>
        </form>
      ) : (
        <div className="game-created">
          <button
            type="button"
            className="invite-toggle"
            onClick={() => setInviteOpen(!inviteExpanded)}
          >
            <span className="invite-toggle-label">
              Invite players — code <strong>{gameCode}</strong>
            </span>
            <span className={`invite-chevron ${inviteExpanded ? 'open' : ''}`}>&#9662;</span>
          </button>

          {inviteExpanded && (
          <div className="invite-panel">
          <div className="game-code-display">
            <div className="code-label">Game Code</div>
            <div className="code-value">{gameCode}</div>
            <div className="join-url">{getJoinUrl()}</div>
          </div>

          <div className="qr-code-container">
            <QRCodeSVG
              value={getJoinUrl()}
              size={160}
              level="M"
              bgColor="transparent"
              fgColor="var(--text-primary)"
            />
          </div>

          <button onClick={handleShare} className="next-round-button" style={{ width: '100%', marginBottom: 'var(--space-md)' }}>
            Share Game
          </button>

          <a
            href={getSpectatorUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="spectator-link"
          >
            📺 Open Spectator View
          </a>

          <div className="share-section">
            <p>Or share individual team links:</p>
            {teams.map((team, teamIndex) => (
              <div key={teamIndex} className="team-share-row">
                <p>{team.name}</p>
                <a href={getTeamUrl(teamIndex)}>{getTeamUrl(teamIndex)}</a>
                <div className="share-buttons">
                  <button type="button" onClick={() => shareGame(teamIndex, 'whatsapp')}>
                    WhatsApp
                  </button>
                  <button type="button" onClick={() => shareGame(teamIndex, 'sms')}>
                    SMS
                  </button>
                  <button type="button" onClick={() => shareGame(teamIndex, 'copy')}>
                    Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
          </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GameSetup;
