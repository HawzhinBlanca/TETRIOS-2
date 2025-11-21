

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { VisualEffectPayload } from '../types'; 

type VisualEffectType = 'SHAKE' | 'PARTICLE' | 'FLASH' | 'FRENZY_START' | 'FRENZY_END' | 'POWERUP_ACTIVATE' | 'BLITZ_SPEED_THRESHOLD' | 'FLIPPED_GRAVITY_ACTIVATE' | 'FLIPPED_GRAVITY_END';

interface UiState {
  isSettingsOpen: boolean;
  isMuted: boolean;
  shakeClass: string;
  showAi: boolean;
  flashOverlay: string | null;
  visualEffect: VisualEffectPayload | null; // Use the new union type here
  musicEnabled: boolean;

  toggleSettings: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  toggleMute: () => void;
  setShakeClass: (cls: string) => void;
  toggleShowAi: () => void;
  setFlashOverlay: (color: string | null) => void;
  // Use discriminated union to ensure type safety without 'as' casts
  triggerVisualEffect: (type: VisualEffectType, payload?: VisualEffectPayload['payload']) => void; // Strictly type payload
  clearVisualEffect: () => void;
  setMusicEnabled: (enabled: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      isSettingsOpen: false,
      isMuted: false,
      shakeClass: '',
      showAi: true,
      flashOverlay: null,
      visualEffect: null,
      musicEnabled: true,

      toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
      openSettings: () => set({ isSettingsOpen: true }),
      closeSettings: () => set({ isSettingsOpen: false }),
      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
      setShakeClass: (cls) => set({ shakeClass: cls }),
      toggleShowAi: () => set((state) => ({ showAi: !state.showAi })),
      setFlashOverlay: (color) => set({ flashOverlay: color }),
      // Corrected `payload as` casts to directly assign based on type
      triggerVisualEffect: (type, payload) => {
        // TypeScript will correctly infer the type of `payload` based on `type` when `visualEffect` is assigned.
        set({ visualEffect: { type, payload } as VisualEffectPayload });
      },
      clearVisualEffect: () => set({ visualEffect: null }),
      setMusicEnabled: (enabled) => set({ musicEnabled: enabled }),
    }),
    {
      name: 'tetrios-ui-store',
      partialize: (state) => ({ musicEnabled: state.musicEnabled, isMuted: state.isMuted, showAi: state.showAi }),
    }
  )
);