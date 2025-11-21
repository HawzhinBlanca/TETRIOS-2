
import React from 'react';
import { GameProvider } from './contexts/GameContext';
import { TetriosGame } from './components/TetriosGame';

const App = () => (
  <GameProvider>
    <TetriosGame />
  </GameProvider>
);

export default App;
