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
