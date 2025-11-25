
import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useTetrios } from '../hooks/useTetrios';

// Return type of the useTetrios hook
type UseTetriosReturn = ReturnType<typeof useTetrios>;

const GameContext = createContext<UseTetriosReturn | null>(null);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const gameState = useTetrios();

  // Memoize the context value to prevent re-rendering consumers unless state actually changes
  // Note: useTetrios already throttles stats updates, so this mainly protects against parent re-renders
  const memoizedValue = useMemo(() => gameState, [
      gameState.stats, 
      gameState.gameState, 
      gameState.previousGameState,
      gameState.nextQueue, 
      gameState.heldPiece, 
      gameState.canHold,
      gameState.gameMode,
      gameState.aiHint,
      gameState.missedOpportunity, // Added
      gameState.controls,
      gameState.comboCount,
      gameState.garbagePending,
      gameState.pieceIsGrounded,
      gameState.flippedGravity,
      gameState.wildcardPieceActive,
      gameState.isSelectingBombRows,
      gameState.bombRowsToClear,
      gameState.isSelectingLine,
      gameState.selectedLineToClear,
      gameState.blitzSpeedThresholdIndex,
      gameState.dangerLevel,
      gameState.lastHoldTime
  ]);

  return (
    <GameContext.Provider value={memoizedValue}>
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
