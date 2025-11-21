


import { useEffect, useRef, useCallback } from 'react';
import { GameCore } from '../utils/GameCore';
import { GameState, GameMode } from '../types';

interface GameLoopConfig {
    das: number;
    arr: number;
}

export const useGameLoop = (
    engine: React.MutableRefObject<GameCore>,
    gameState: GameState,
    config: GameLoopConfig
) => {
    const requestRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);

    // --- Sync Configuration ---
    useEffect(() => {
        if (engine.current) {
            // Sync DAS/ARR directly to the internal InputManager
            engine.current.setInputConfig({
                das: config.das,
                arr: config.arr
            });
        }
    }, [config.das, config.arr]);


    // --- The Game Loop ---
    const update = useCallback((time: number) => {
        if (!engine.current) return;

        // Only update logic in active states
        const currentState = engine.current.stateManager.currentState;
        const shouldUpdate = 
            currentState === 'PLAYING' || 
            currentState === 'WILDCARD_SELECTION' || 
            currentState === 'BOMB_SELECTION' || 
            currentState === 'LINE_SELECTION';

        if (shouldUpdate) {
            const deltaTime = time - lastTimeRef.current;
            
            if (currentState === 'PLAYING') {
                engine.current.update(deltaTime);
            } else {
                // For selection screens, we might still want animations (particles/text) to update
                engine.current.updateEphemeralStates(deltaTime);
            }
        }
        
        lastTimeRef.current = time;
        requestRef.current = requestAnimationFrame(update);
    }, []);

    useEffect(() => {
        if (gameState === 'PLAYING' || gameState === 'WILDCARD_SELECTION' || gameState === 'BOMB_SELECTION' || gameState === 'LINE_SELECTION') {
            lastTimeRef.current = performance.now();
            requestRef.current = requestAnimationFrame(update);
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [gameState, update]);
};