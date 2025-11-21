
import { useEffect, useRef } from 'react';
import { InputManager } from '../utils/InputManager';
import { KeyAction, KeyMap } from '../types';

interface GameInputConfig {
  keyMap: KeyMap;
  das: number;
  arr: number;
  flippedGravity: boolean;
}

export const useGameInput = (
  config: GameInputConfig,
  onAction: (action: KeyAction) => void
) => {
  const inputManager = useRef<InputManager | null>(null);

  useEffect(() => {
     // Initialize the dedicated InputManager instance
     inputManager.current = new InputManager({
        keyMap: config.keyMap,
        das: config.das,
        arr: config.arr,
        flippedGravity: config.flippedGravity
     });
     
     inputManager.current.addActionListener(onAction);
     
     return () => {
         inputManager.current?.destroy();
         inputManager.current = null;
     }
  }, []); 

  useEffect(() => {
      if (inputManager.current) {
          // Sync configuration updates reactively
          inputManager.current.updateConfig({ 
              keyMap: config.keyMap,
              das: config.das,
              arr: config.arr,
              flippedGravity: config.flippedGravity
          });
      }
  }, [config.keyMap, config.das, config.arr, config.flippedGravity]);
  
  return inputManager;
};
