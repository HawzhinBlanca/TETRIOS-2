
import { create } from 'zustand';

interface ModalState {
  isSettingsOpen: boolean;
  isHelpOpen: boolean;
  isProfileOpen: boolean;
  activeTutorialTip: string | null;

  openSettings: () => void;
  closeSettings: () => void;
  toggleSettings: () => void;
  
  openHelp: () => void;
  closeHelp: () => void;
  toggleHelp: () => void;

  openProfile: () => void;
  closeProfile: () => void;

  setTutorialTip: (text: string) => void;
  dismissTutorialTip: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  isSettingsOpen: false,
  isHelpOpen: false,
  isProfileOpen: false,
  activeTutorialTip: null,

  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),
  toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),

  openHelp: () => set({ isHelpOpen: true }),
  closeHelp: () => set({ isHelpOpen: false }),
  toggleHelp: () => set((state) => ({ isHelpOpen: !state.isHelpOpen })),

  openProfile: () => set({ isProfileOpen: true }),
  closeProfile: () => set({ isProfileOpen: false }),

  setTutorialTip: (text) => set({ activeTutorialTip: text }),
  dismissTutorialTip: () => set({ activeTutorialTip: null }),
}));
