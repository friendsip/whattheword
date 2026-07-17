import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import GameSetup from './GameSetup';
import Player from './Player';
import JoinGame from './JoinGame';
import Spectator from './Spectator';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        {/* Slim YourKids bar on every screen — the promised "easy exit" back
            to the main site. Game state lives on the server, so a player who
            taps out mid-round can reopen their link and carry on. */}
        <header className="yk-bar">
          <a
            className="yk-bar__logo"
            href="https://www.yourkids.com"
            aria-label="YourKids — back to the main site"
          >
            YourKids<span className="yk-bar__dot">.</span>
          </a>
          <a className="yk-bar__exit" href="https://www.yourkids.com/games">
            Exit to yourkids.com &rarr;
          </a>
        </header>
        <Routes>
          <Route path="/" element={<GameSetup />} />
          <Route path="/join" element={<JoinGame />} />
          <Route path="/join/:gameCode" element={<JoinGame />} />
          <Route path="/game/:gameId/team/:teamIndex" element={<Player />} />
          <Route path="/game/:gameId/spectate" element={<Spectator />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
