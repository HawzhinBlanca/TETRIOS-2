import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ADVENTURE_CAMPAIGN, MAX_STARS_PER_LEVEL } from '../constants';
import { AdventureLevelConfig } from '../types';

interface AdventureState {
    unlockedIndex: number;
    currentLevelId: string | null;
    failedAttempts: { [levelId: string]: number }; // New: Track failed attempts per level
    starsEarned: { [levelId: string]: number }; // New: Track stars earned per level (0-3)
    
    unlockNextLevel: () => void;
    setCurrentLevel: (id: string) => void;
    getLevelConfig: (id: string) => AdventureLevelConfig | undefined;
    getCurrentLevelConfig: () => AdventureLevelConfig | undefined;
    trackFailedLevel: (levelId: string) => void; // New: Increment failed attempts
    getFailedAttempts: (levelId: string) => number; // New: Get failed attempts count
    clearFailedAttempts: (levelId: string) => void; // New: Clear failed attempts on success
    setStarsEarned: (levelId: string, stars: number) => void; // New: Set stars for a level
    getStarsEarned: (levelId: string) => number; // New: Get stars for a level
    resetProgress: () => void;
}

export const useAdventureStore = create<AdventureState>()(
    persist(
        (set, get) => ({
            unlockedIndex: 0,
            currentLevelId: null,
            failedAttempts: {}, // Initialize failed attempts
            starsEarned: {}, // Initialize stars earned

            unlockNextLevel: () => {
                set((state) => ({ 
                    unlockedIndex: Math.max(state.unlockedIndex, (get().getCurrentLevelConfig()?.index || 0) + 1) 
                }));
            },

            setCurrentLevel: (id) => set({ currentLevelId: id }),

            getLevelConfig: (id) => {
                for (const world of ADVENTURE_CAMPAIGN) {
                    const level = world.levels.find(l => l.id === id);
                    if (level) return level;
                }
                return undefined;
            },

            getCurrentLevelConfig: () => {
                const { currentLevelId } = get();
                if (!currentLevelId) return undefined;
                return get().getLevelConfig(currentLevelId);
            },

            trackFailedLevel: (levelId) => {
                set((state) => ({
                    failedAttempts: {
                        ...state.failedAttempts,
                        [levelId]: (state.failedAttempts[levelId] || 0) + 1,
                    },
                }));
            },

            getFailedAttempts: (levelId) => {
                return get().failedAttempts[levelId] || 0;
            },

            clearFailedAttempts: (levelId) => {
                set((state) => {
                    const newAttempts = { ...state.failedAttempts };
                    delete newAttempts[levelId]; // Clear specific level's attempts
                    return { failedAttempts: newAttempts };
                });
            },

            setStarsEarned: (levelId, stars) => {
                set((state) => ({
                    starsEarned: {
                        ...state.starsEarned,
                        [levelId]: Math.min(MAX_STARS_PER_LEVEL, Math.max(0, stars)),
                    },
                }));
            },

            getStarsEarned: (levelId) => {
                return get().starsEarned[levelId] || 0;
            },

            resetProgress: () => set({ unlockedIndex: 0, currentLevelId: null, failedAttempts: {}, starsEarned: {} })
        }),
        {
            name: 'tetrios-adventure-store',
            version: 2, // Increased version to ensure schema compatibility
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
              unlockedIndex: state.unlockedIndex,
              failedAttempts: state.failedAttempts,
              starsEarned: state.starsEarned, 
            }),
            migrate: (persistedState: any, currentVersion) => {
                if (currentVersion === 0) {
                    persistedState.starsEarned = {}; 
                }
                if (currentVersion < 2) {
                    // Ensure strict types for existing data
                    if (!persistedState.failedAttempts) persistedState.failedAttempts = {};
                    if (!persistedState.starsEarned) persistedState.starsEarned = {};
                }
                return persistedState as AdventureState;
            },
        }
    )
);