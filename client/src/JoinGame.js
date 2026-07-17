import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './JoinGame.css';

function JoinGame() {
  const { gameCode: urlCode } = useParams();
  const navigate = useNavigate();
  const [gameCode, setGameCode] = useState(urlCode || '');
  const [teams, setTeams] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (urlCode) {
      fetchTeams(urlCode);
    }
  }, [urlCode]);

  const fetchTeams = async (code) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/games/${code.toUpperCase()}/teams`);
      setTeams(response.data.teams);
      setGameCode(code.toUpperCase());
    } catch (err) {
      setError('Game not found. Check your code and try again.');
      setTeams(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    if (gameCode.trim().length > 0) {
      fetchTeams(gameCode.trim());
    }
  };

  const handleJoinTeam = (teamIndex) => {
    navigate(`/game/${gameCode}/team/${teamIndex}`);
  };

  return (
    <div className="join-container">
      <h1>What the Word?!</h1>
      <p className="join-subtitle">
        {teams ? "You're in! Choose a team below" : 'Enter your game code to join'}
      </p>

      {error && <div className="join-error">{error}</div>}

      {!teams ? (
        <form onSubmit={handleCodeSubmit} className="code-form">
          <input
            type="text"
            value={gameCode}
            onChange={(e) => setGameCode(e.target.value.toUpperCase())}
            placeholder="GAME CODE"
            className="code-input"
            maxLength={8}
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
          />
          <button type="submit" className="code-submit" disabled={loading || gameCode.trim().length === 0}>
            {loading ? 'Looking...' : 'Join Game'}
          </button>
        </form>
      ) : (
        <div className="team-picker">
          <p className="pick-label">Pick your team:</p>
          <div className="team-list">
            {teams.map((team, index) => (
              <button
                key={index}
                className="team-pick-button"
                onClick={() => handleJoinTeam(index)}
                style={{ borderLeftColor: `var(--team-${index + 1})` }}
              >
                <span className="team-pick-name">{team.name}</span>
                <span className="team-pick-arrow">&rarr;</span>
              </button>
            ))}
          </div>
          <button
            className="back-button"
            onClick={() => { setTeams(null); setGameCode(''); setError(null); }}
          >
            Different code
          </button>
        </div>
      )}
    </div>
  );
}

export default JoinGame;
