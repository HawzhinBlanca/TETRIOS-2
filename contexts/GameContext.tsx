
import React, { createContext, useContext, ReactNode } from 'react';
import { useTetrios } from '../hooks/useTetrios';

// Return type of the useTetrios hook
type UseTetriosReturn = ReturnType<typeof useTetrios>;

const GameContext = createContext<UseTetriosReturn | null>(null);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const gameState = useTetrios();

  return (
    <GameContext.Provider value={gameState}>
      {children}
    </GameContext.Provider>
  );
};

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
};
