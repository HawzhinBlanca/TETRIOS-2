import { useState, useCallback, useEffect } from 'react';
import { KeyMap, KeyAction } from '../types';

export const DEFAULT_CONTROLS: KeyMap = {
    moveLeft: ['ArrowLeft', 'a'],
    moveRight: ['ArrowRight', 'd'],
    softDrop: ['ArrowDown', 's'],
    hardDrop: [' '],
    rotateCW: ['ArrowUp', 'x', 'w'],
    rotateCCW: ['z', 'Control'],
    hold: ['c', 'Shift'],
};

export const useGameInput = () => {
    const [controls, setControlsState] = useState<KeyMap>(DEFAULT_CONTROLS);

    // Load controls from local storage on mount
    useEffect(() => {
        const savedControls = localStorage.getItem('tetrios_controls');
        if (savedControls) {
            try {
                const parsedControls: KeyMap = JSON.parse(savedControls);
                // Merge with default to ensure all keys exist if schema changes
                setControlsState({ ...DEFAULT_CONTROLS, ...parsedControls });
            } catch(e) {
                console.error("Failed to parse saved controls", e);
            }
        }
    }, []);

    const setKeyBinding = useCallback((action: KeyAction, key: string, slot: number = 0) => {
        if (key === 'Escape') return;
        
        setControlsState(prevControls => {
            // Deep clone to avoid mutation issues
            const newControls = JSON.parse(JSON.stringify(prevControls)) as KeyMap;
  
            // If clearing a binding
            if (key === 'Backspace' || key === 'Delete') {
                if (newControls[action]) {
                    // Remove the key at the specific slot if it exists
                    if (slot < newControls[action].length) {
                        newControls[action] = newControls[action].filter((_, i) => i !== slot);
                    }
                }
            } else {
                // If binding a new key, first unbind it from anywhere else it might be used
                Object.keys(newControls).forEach(k => {
                    const act = k as KeyAction;
                    if (newControls[act].includes(key)) {
                        newControls[act] = newControls[act].filter((k_item) => k_item !== key);
                    }
                });
  
                // Assign to new slot
                const currentKeys = newControls[action] || [];
                if (slot >= currentKeys.length) {
                    currentKeys.push(key);
                } else {
                    currentKeys[slot] = key;
                }
                newControls[action] = currentKeys;
            }
            
            localStorage.setItem('tetrios_controls', JSON.stringify(newControls));
            return newControls;
        });
    }, []);

    return {
        controls,
        setKeyBinding,
        DEFAULT_CONTROLS
    };
};