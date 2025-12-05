
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { GhostStyle, ColorblindMode, BlockSkin, GridDensity } from '../types';
import { safeStorage } from '../utils/safeStorage';

const isTouchDevice = () => {
  if (typeof window === 'undefined') return false;
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
};

export type TouchControlMode = 'HYBRID' | 'GESTURES' | 'BUTTONS';

interface GameSettingsState {
  ghostStyle: GhostStyle;
  ghostOpacity: number;
  ghostOutlineThickness: number;
  ghostGlowIntensity: number;
  blockGlowIntensity: number; 
  gameSpeed: number; // Gravity multiplier
  lockWarning: boolean;
  showAi: boolean; 
  das: number; // Delayed Auto Shift
  arr: number; // Auto Repeat Rate
  cameraShake: boolean;
  enableTouchControls: boolean;
  touchControlMode: TouchControlMode; // New Setting
  swapTouchControls: boolean; 
  vibrationEnabled: boolean; 
  colorblindMode: ColorblindMode;
  blockSkin: BlockSkin; 
  trueRandom: boolean; // No Cap Mode
  gridDensity: GridDensity; // Dense (20x50) or Comfort (10x24)
  swipeSensitivity: number; // Touch sensitivity multiplier
  
  // Audio Mixer Volumes
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  uiVolume: number;
  
  // Granular Music Mix
  bassVolume: number;
  drumVolume: number;
  padVolume: number;
  arpVolume: number;

  setGhostStyle: (style: GhostStyle) => void;
  setGhostOpacity: (val: number) => void;
  setGhostOutlineThickness: (val: number) => void;
  setGhostGlowIntensity: (val: number) => void;
  setBlockGlowIntensity: (val: number) => void; 
  setGameSpeed: (val: number) => void;
  setLockWarning: (enabled: boolean) => void;
  toggleShowAi: () => void;
  setDas: (val: number) => void;
  setArr: (val: number) => void;
  setCameraShake: (enabled: boolean) => void;
  setEnableTouchControls: (enabled: boolean) => void;
  setTouchControlMode: (mode: TouchControlMode) => void;
  setSwapTouchControls: (enabled: boolean) => void; 
  setVibrationEnabled: (enabled: boolean) => void; 
  setColorblindMode: (mode: ColorblindMode) => void;
  setBlockSkin: (skin: BlockSkin) => void; 
  setTrueRandom: (enabled: boolean) => void;
  setGridDensity: (density: GridDensity) => void;
  setSwipeSensitivity: (val: number) => void;
  
  setMasterVolume: (val: number) => void;
  setMusicVolume: (val: number) => void;
  setSfxVolume: (val: number) => void;
  setUiVolume: (val: number) => void;
  
  setBassVolume: (val: number) => void;
  setDrumVolume: (val: number) => void;
  setPadVolume: (val: number) => void;
  setArpVolume: (val: number) => void;
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
      blockGlowIntensity: 1, 
      gameSpeed: 1.0,
      lockWarning: true,
      showAi: true,
      das: 133,
      arr: 10,
      cameraShake: true,
      enableTouchControls: isTouchDevice(),
      touchControlMode: 'HYBRID',
      swapTouchControls: false,
      vibrationEnabled: true,
      colorblindMode: 'NORMAL',
      blockSkin: 'NEON',
      trueRandom: false,
      gridDensity: 'COMFORT', // Default to Comfort (10x24) for standard play - "The Fix"
      swipeSensitivity: 1.5, // Default sensitivity
      
      masterVolume: 0.6,
      musicVolume: 0.5,
      sfxVolume: 0.7,
      uiVolume: 0.6,
      
      bassVolume: 0.8,
      drumVolume: 0.7,
      padVolume: 0.6,
      arpVolume: 0.5,

      // Actions
      setGhostStyle: (style) => set({ ghostStyle: style }),
      setGhostOpacity: (val) => set({ ghostOpacity: val }),
      setGhostOutlineThickness: (val) => set({ ghostOutlineThickness: val }),
      setGhostGlowIntensity: (val) => set({ ghostGlowIntensity: val }),
      setBlockGlowIntensity: (val) => set({ blockGlowIntensity: val }),
      setGameSpeed: (val) => set({ gameSpeed: val }),
      setLockWarning: (enabled) => set({ lockWarning: enabled }),
      toggleShowAi: () => set((state) => ({ showAi: !state.showAi })),
      setDas: (val) => set({ das: val }),
      setArr: (val) => set({ arr: val }),
      setCameraShake: (enabled) => set({ cameraShake: enabled }),
      setEnableTouchControls: (enabled) => set({ enableTouchControls: enabled }),
      setTouchControlMode: (mode) => set({ touchControlMode: mode }),
      setSwapTouchControls: (enabled) => set({ swapTouchControls: enabled }),
      setVibrationEnabled: (enabled) => set({ vibrationEnabled: enabled }),
      setColorblindMode: (mode) => set({ colorblindMode: mode }),
      setBlockSkin: (skin) => set({ blockSkin: skin }),
      setTrueRandom: (enabled) => set({ trueRandom: enabled }),
      setGridDensity: (density) => set({ gridDensity: density }),
      setSwipeSensitivity: (val) => set({ swipeSensitivity: val }),
      
      setMasterVolume: (val) => set({ masterVolume: val }),
      setMusicVolume: (val) => set({ musicVolume: val }),
      setSfxVolume: (val) => set({ sfxVolume: val }),
      setUiVolume: (val) => set({ uiVolume: val }),
      
      setBassVolume: (val) => set({ bassVolume: val }),
      setDrumVolume: (val) => set({ drumVolume: val }),
      setPadVolume: (val) => set({ padVolume: val }),
      setArpVolume: (val) => set({ arpVolume: val }),
    }),
    {
      name: 'tetrios-game-settings-store', 
      version: 14,
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        ghostStyle: state.ghostStyle,
        ghostOpacity: state.ghostOpacity,
        ghostOutlineThickness: state.ghostOutlineThickness,
        ghostGlowIntensity: state.ghostGlowIntensity,
        blockGlowIntensity: state.blockGlowIntensity,
        gameSpeed: state.gameSpeed,
        lockWarning: state.lockWarning,
        showAi: state.showAi,
        das: state.das,
        arr: state.arr,
        cameraShake: state.cameraShake,
        enableTouchControls: state.enableTouchControls,
        touchControlMode: state.touchControlMode,
        swapTouchControls: state.swapTouchControls,
        vibrationEnabled: state.vibrationEnabled,
        colorblindMode: state.colorblindMode,
        blockSkin: state.blockSkin,
        trueRandom: state.trueRandom,
        gridDensity: state.gridDensity,
        swipeSensitivity: state.swipeSensitivity,
        masterVolume: state.masterVolume,
        musicVolume: state.musicVolume,
        sfxVolume: state.sfxVolume,
        uiVolume: state.uiVolume,
        bassVolume: state.bassVolume,
        drumVolume: state.drumVolume,
        padVolume: state.padVolume,
        arpVolume: state.arpVolume,
      }),
      migrate: (persistedState: any, currentVersion) => {
        if (currentVersion < 11) {
            if (persistedState.trueRandom === undefined) persistedState.trueRandom = false;
        }
        if (currentVersion < 12) {
            persistedState.bassVolume = 0.8;
            persistedState.drumVolume = 0.7;
            persistedState.padVolume = 0.6;
            persistedState.arpVolume = 0.5;
        }
        if (currentVersion < 13) {
            persistedState.swipeSensitivity = 1.5;
            persistedState.gridDensity = 'COMFORT';
        }
        if (currentVersion < 14) {
            persistedState.touchControlMode = 'HYBRID';
        }
        return persistedState as GameSettingsState;
      },
    },
  ),
);
