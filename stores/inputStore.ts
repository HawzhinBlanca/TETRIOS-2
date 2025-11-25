
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { KeyMap, KeyAction } from '../types';
import { safeStorage } from '../utils/safeStorage';
import { DEFAULT_CONTROLS } from '../constants';

interface InputState {
    controls: KeyMap;
    setKeyBinding: (action: KeyAction, key: string, slot: number) => void;
    resetControls: () => void;
}

export const useInputStore = create<InputState>()(
    persist(
        (set) => ({
            controls: DEFAULT_CONTROLS,
            setKeyBinding: (action, key, slot) => set((state) => {
                if (key === 'Escape') return state;

                const newControls = JSON.parse(JSON.stringify(state.controls)) as KeyMap;
                
                if (key === 'Backspace' || key === 'Delete') {
                    if (newControls[action]) {
                        if (slot < newControls[action].length) {
                            newControls[action] = newControls[action].filter((_, i) => i !== slot);
                        }
                    }
                } else {
                    // Remove key if it's already bound to ANY action to prevent conflicts
                    Object.keys(newControls).forEach(k => {
                        const act = k as KeyAction;
                        if (newControls[act].includes(key)) {
                            newControls[act] = newControls[act].filter((k_item) => k_item !== key);
                        }
                    });
      
                    const currentKeys = newControls[action] || [];
                    // Ensure array is large enough
                    while (currentKeys.length < slot) {
                        currentKeys.push('');
                    }
                    currentKeys[slot] = key;
                    newControls[action] = currentKeys;
                }
                
                return { controls: newControls };
            }),
            resetControls: () => set({ controls: DEFAULT_CONTROLS }),
        }),
        {
            name: 'tetrios-controls-store',
            storage: createJSONStorage(() => safeStorage),
            version: 2, // Version bumped
            migrate: (persistedState: any, currentVersion) => {
                // Merge with defaults to ensure new actions are added if missing
                if (persistedState && persistedState.controls) {
                    persistedState.controls = { ...DEFAULT_CONTROLS, ...persistedState.controls };
                }
                return persistedState as InputState;
            },
        }
    )
);
