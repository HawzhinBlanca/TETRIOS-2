import React, { useEffect } from 'react';
import { GameCore } from '../utils/GameCore';
import { KeyMap } from '../types';

export const useGameInputWiring = (
    engine: React.MutableRefObject<GameCore>,
    controls: KeyMap
) => {
    useEffect(() => {
        if (engine.current) {
            engine.current.setInputConfig({ keyMap: controls });
        }
    }, [controls, engine]);
};