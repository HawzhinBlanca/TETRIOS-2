
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { GhostStyle, ColorblindMode, BlockSkin } from '../types';
import { safeStorage } from '../utils/safeStorage';

const isTouchDevice = () => {
  if (typeof window === 'undefined') return false;
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
};

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
  cameraShake: boolean;
  enableTouchControls: boolean;
  colorblindMode: ColorblindMode;
  blockSkin: BlockSkin; // NEW
  
  // Audio Mixer Volumes
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  uiVolume: number;

  setGhostStyle: (style: GhostStyle) => void;
  setGhostOpacity: (val: number) => void;
  setGhostOutlineThickness: (val: number) => void;
  setGhostGlowIntensity: (val: number) => void;
  setGameSpeed: (val: number) => void;
  setLockWarning: (enabled: boolean) => void;
  toggleShowAi: () => void;
  setDas: (val: number) => void;
  setArr: (val: number) => void;
  setCameraShake: (enabled: boolean) => void;
  setEnableTouchControls: (enabled: boolean) => void;
  setColorblindMode: (mode: ColorblindMode) => void;
  setBlockSkin: (skin: BlockSkin) => void; // NEW
  
  setMasterVolume: (val: number) => void;
  setMusicVolume: (val: number) => void;
  setSfxVolume: (val: number) => void;
  setUiVolume: (val: number) => void;
}

// Export the store hook
export const useGameSettingsStore = create<GameSettingsState>()(
  persist(
    (set) => ({
      // Default values
      ghostStyle: 'neon',
      ghostOpacity: 0.5,
      ghostOutlineThickness: 2,
      ghostGlowIntensity: 1,
      gameSpeed: 1.0,
      lockWarning: true,
      showAi: true,
      das: 133,
      arr: 10,
      cameraShake: true,
      enableTouchControls: isTouchDevice(),
      colorblindMode: 'NORMAL',
      blockSkin: 'NEON',
      
      masterVolume: 0.6,
      musicVolume: 0.5,
      sfxVolume: 0.7,
      uiVolume: 0.6,

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
      setCameraShake: (enabled) => set({ cameraShake: enabled }),
      setEnableTouchControls: (enabled) => set({ enableTouchControls: enabled }),
      setColorblindMode: (mode) => set({ colorblindMode: mode }),
      setBlockSkin: (skin) => set({ blockSkin: skin }),
      
      setMasterVolume: (val) => set({ masterVolume: val }),
      setMusicVolume: (val) => set({ musicVolume: val }),
      setSfxVolume: (val) => set({ sfxVolume: val }),
      setUiVolume: (val) => set({ uiVolume: val }),
    }),
    {
      name: 'tetrios-game-settings-store', 
      version: 8, // Version increment for blockSkin
      storage: createJSONStorage(() => safeStorage),
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
        cameraShake: state.cameraShake,
        enableTouchControls: state.enableTouchControls,
        colorblindMode: state.colorblindMode,
        blockSkin: state.blockSkin,
        masterVolume: state.masterVolume,
        musicVolume: state.musicVolume,
        sfxVolume: state.sfxVolume,
        uiVolume: state.uiVolume,
      }),
      migrate: (persistedState: any, currentVersion) => {
        if (currentVersion < 8) {
            if (persistedState.blockSkin === undefined) persistedState.blockSkin = 'NEON';
        }
        return persistedState as GameSettingsState;
      },
    },
  ),
);
