
import React from 'react';
import { GameProvider } from './contexts/GameContext';
import { TetriosGame } from './components/TetriosGame';
import ErrorBoundary from './components/ErrorBoundary';

const App = () => (
  <GameProvider>
    <ErrorBoundary>
      <TetriosGame />
    </ErrorBoundary>
  </GameProvider>
);

export default App;
