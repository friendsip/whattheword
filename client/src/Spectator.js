import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './Spectator.css';

const API_URL = process.env.REACT_APP_API_URL || '';

const TEAM_COLORS = [
  '#6c5ce7', '#00b894', '#ff6b6b', '#ffd93d', '#0984e3',
  '#e17055', '#00cec9', '#fd79a8', '#636e72', '#a29bfe',
];

function Spectator() {
  const { gameId } = useParams();
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState(null);

  const fetchGameState = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/games/${gameId}`);
      setGameState(response.data);
    } catch (err) {
      setError('Game not found');
    }
  }, [gameId]);

  useEffect(() => {
    fetchGameState();
    const interval = setInterval(fetchGameState, 1000);
    return () => clearInterval(interval);
  }, [fetchGameState]);

  if (error) {
    return (
      <div className="spectator-container">
        <div className="spectator-error">{error}</div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="spectator-container">
        <p>Loading...</p>
      </div>
    );
  }

  const sortedTeams = [...gameState.teams].sort((a, b) => b.score - a.score);
  const maxScore = Math.max(...gameState.teams.map(t => t.score), 1);
  const winner = sortedTeams[0];

  // Big status block — readable from the back of a classroom
  const renderStatus = () => {
    if (gameState.gameComplete) {
      const isTie = sortedTeams.filter(t => t.score === winner.score).length > 1;
      return (
        <div className="spectator-status">
          <div className="spectator-status-heading">Game Over!</div>
          <div className="spectator-status-detail">
            {isTie ? "It's a tie!" : `${winner.name} wins!`}
          </div>
        </div>
      );
    }
    if (gameState.roundActive) {
      return (
        <div className="spectator-status live">
          <div className="spectator-round-label">
            <span className="spectator-live-dot" /> Round {gameState.currentRound} of {gameState.totalRounds}
          </div>
          <div className={`spectator-timer ${gameState.timeLeft <= 10 ? 'critical' : ''}`}>
            {gameState.timeLeft}s
          </div>
        </div>
      );
    }
    if (gameState.gameStarted) {
      return (
        <div className="spectator-status">
          <div className="spectator-status-heading">
            Round {gameState.currentRound} of {gameState.totalRounds}
          </div>
          <div className="spectator-status-detail">Next round starting soon…</div>
        </div>
      );
    }
    return (
      <div className="spectator-status">
        <div className="spectator-status-heading">Waiting to start</div>
        <div className="spectator-status-detail">
          Join with code <strong className="spectator-code">{gameId}</strong>
        </div>
      </div>
    );
  };

  return (
    <div className="spectator-container">
      <h1>What the Word?!</h1>

      {renderStatus()}

      <div className="spectator-scores">
        {sortedTeams.map((team, index) => {
          const originalIndex = gameState.teams.findIndex(t => t.name === team.name);
          const roundCorrect = (team.roundHistory || []).filter(h => h.result === 'correct').length;
          return (
            <div key={team.name} className="spectator-team">
              <div className="spectator-team-header">
                <span className="spectator-rank">{index + 1}</span>
                <span className="spectator-name">{team.name}</span>
                {gameState.roundActive && (
                  <span className="spectator-round-count">+{roundCorrect} this round</span>
                )}
                <span className="spectator-points">{team.score}</span>
              </div>
              <div className="spectator-bar">
                <div
                  className="spectator-bar-fill"
                  style={{
                    width: `${maxScore > 0 ? (team.score / maxScore) * 100 : 0}%`,
                    backgroundColor: TEAM_COLORS[originalIndex % TEAM_COLORS.length],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Spectator;
