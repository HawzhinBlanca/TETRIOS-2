
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from '../utils/safeStorage';

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
      version: 3, 
      storage: createJSONStorage(() => safeStorage),
      migrate: (persistedState: any, currentVersion) => {
        return persistedState as UiState;
      },
    }
  )
);
