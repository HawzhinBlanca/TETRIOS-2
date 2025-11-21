
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface UiState {
  isMuted: boolean;
  musicEnabled: boolean;

  toggleMute: () => void;
  setMusicEnabled: (enabled: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      isMuted: false,
      musicEnabled: true,

      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
      setMusicEnabled: (enabled) => set({ musicEnabled: enabled }),
    }),
    {
      name: 'tetrios-ui-store',
      version: 3, // Increment version due to schema change (removed showAi)
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState: any, currentVersion) => {
        // Simply return the state as compatible since removed fields are just ignored by the new store
        return persistedState as UiState;
      },
    }
  )
);
