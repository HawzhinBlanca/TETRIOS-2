import { useRef, useEffect, useState } from 'react';
import { GameCore } from '../utils/GameCore';
import { DEFAULT_DAS, DEFAULT_ARR, DEFAULT_CONTROLS } from '../constants';
import { LayoutMetrics } from './useResponsiveLayout';

export const useGameEngine = (layout: LayoutMetrics) => {
    const engine = useRef<GameCore>(null!);
    const [savedGameExists, setSavedGameExists] = useState(false);

    // Initialize Engine
    if (!engine.current) {
        engine.current = new GameCore({
            keyMap: DEFAULT_CONTROLS,
            das: DEFAULT_DAS,
            arr: DEFAULT_ARR,
            initialGrid: { width: layout.cols, height: layout.rows }
        });
        
        setSavedGameExists(GameCore.hasSavedGame());
    }

    // Sync Grid Size on Layout Change
    useEffect(() => {
        if (engine.current) {
            engine.current.grid = { width: layout.cols, height: layout.rows };
            engine.current.inputManager.updateConfig({ stageWidth: layout.cols });
            if (engine.current.stateManager.isMenu()) {
                engine.current.boardManager.initialize('MARATHON', 0);
            }
        }
    }, [layout.cols, layout.rows]);

    // Cleanup
    useEffect(() => {
        return () => {
            engine.current?.destroy();
        };
    }, []);

    return { engine, savedGameExists, setSavedGameExists };
};