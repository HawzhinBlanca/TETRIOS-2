
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { GhostStyle } from '../types';

interface GameSettingsState {
  ghostStyle: GhostStyle;
  ghostOpacity: number;
  ghostOutlineThickness: number;
  ghostGlowIntensity: number;
  gameSpeed: number; // Gravity multiplier
  lockWarning: boolean;
  showAi: boolean; // Moved from uiStore
  das: number; // Delayed Auto Shift
  arr: number; // Auto Repeat Rate

  setGhostStyle: (style: GhostStyle) => void;
  setGhostOpacity: (val: number) => void;
  setGhostOutlineThickness: (val: number) => void;
  setGhostGlowIntensity: (val: number) => void;
  setGameSpeed: (val: number) => void;
  setLockWarning: (enabled: boolean) => void;
  toggleShowAi: () => void;
  setDas: (val: number) => void;
  setArr: (val: number) => void;
}

// Export the store hook
export const useGameSettingsStore = create<GameSettingsState>()(
  persist(
    (set) => ({
      // Default values
      ghostStyle: 'dashed',
      ghostOpacity: 0.5,
      ghostOutlineThickness: 2,
      ghostGlowIntensity: 1,
      gameSpeed: 1.0,
      lockWarning: true,
      showAi: true,
      das: 133,
      arr: 10,

      // Actions
      setGhostStyle: (style) => set({ ghostStyle: style }),
      setGhostOpacity: (val) => set({ ghostOpacity: val }),
      setGhostOutlineThickness: (val) => set({ ghostOutlineThickness: val }),
      setGhostGlowIntensity: (val) => set({ ghostGlowIntensity: val }),
      setGameSpeed: (val) => set({ gameSpeed: val }),
      setLockWarning: (enabled) => set({ lockWarning: enabled }),
      toggleShowAi: () => set((state) => ({ showAi: !state.showAi })),
      setDas: (val) => set({ das: val }),
      setArr: (val) => set({ arr: val }),
    }),
    {
      name: 'tetrios-game-settings-store', 
      version: 3, // Explicit versioning
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        ghostStyle: state.ghostStyle,
        ghostOpacity: state.ghostOpacity,
        ghostOutlineThickness: state.ghostOutlineThickness,
        ghostGlowIntensity: state.ghostGlowIntensity,
        gameSpeed: state.gameSpeed,
        lockWarning: state.lockWarning,
        showAi: state.showAi,
        das: state.das,
        arr: state.arr,
      }),
      migrate: (persistedState: any, currentVersion) => {
        if (currentVersion < 3) {
           // Ensure showAi is initialized if migrating from older version
           if (persistedState.showAi === undefined) {
               persistedState.showAi = true;
           }
        }
        return persistedState as GameSettingsState;
      },
    },
  ),
);
