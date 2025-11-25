
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from '../utils/safeStorage';
import { TetrominoType, AbilityType } from '../types';

interface ProfileStats {
  totalGamesPlayed: number;
  totalScore: number;
  totalLinesCleared: number;
  highestLevelReached: number;
  highScore: number; // Global all-time best
  highScores: Record<string, number>; // Best score per game mode
  unlockedAchievements: string[]; // List of achievement IDs
  unlockedShapes: TetrominoType[]; // Shapes earned
  enabledShapes: TetrominoType[]; // Deck configuration
  unlockedAbilities: AbilityType[]; // Earned skills
  equippedAbilities: AbilityType[]; // Loadout (max 3)
}

interface ProfileState {
  playerName: string;
  stats: ProfileStats;
  setPlayerName: (name: string) => void;
  updateStats: (gameStats: { score: number; rows: number; level: number }, mode?: string) => void;
  unlockAchievement: (id: string) => boolean; // Returns true if newly unlocked
  toggleShape: (shape: TetrominoType) => void;
  unlockAbility: (ability: AbilityType) => void;
  equipAbility: (ability: AbilityType) => void;
  unequipAbility: (ability: AbilityType) => void;
}

const STANDARD_SHAPES: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      playerName: 'Operator',
      stats: {
        totalGamesPlayed: 0,
        totalScore: 0,
        totalLinesCleared: 0,
        highestLevelReached: 0,
        highScore: 0,
        highScores: {},
        unlockedAchievements: [],
        unlockedShapes: [...STANDARD_SHAPES],
        enabledShapes: [...STANDARD_SHAPES],
        unlockedAbilities: ['COLOR_SWAP'], // Start with one unlocked for tutorial
        equippedAbilities: ['COLOR_SWAP'],
      },
      setPlayerName: (name) => set({ playerName: name }),
      updateStats: (gameStats, mode) => set((state) => {
        const currentHighScores = state.stats.highScores || {};
        const modeHighScore = mode ? (currentHighScores[mode] || 0) : 0;
        const newModeHighScore = Math.max(modeHighScore, gameStats.score);
        
        const newHighScores = mode ? { ...currentHighScores, [mode]: newModeHighScore } : currentHighScores;
        const newGlobalHighScore = Math.max(state.stats.highScore || 0, gameStats.score);

        return {
          stats: {
            ...state.stats,
            totalGamesPlayed: state.stats.totalGamesPlayed + 1,
            totalScore: state.stats.totalScore + gameStats.score,
            totalLinesCleared: state.stats.totalLinesCleared + gameStats.rows,
            highestLevelReached: Math.max(state.stats.highestLevelReached, gameStats.level),
            highScore: newGlobalHighScore,
            highScores: newHighScores,
          }
        };
      }),
      unlockAchievement: (id) => {
          const { stats } = get();
          if (stats.unlockedAchievements.includes(id)) return false;
          
          let newUnlockedShapes = [...stats.unlockedShapes];
          
          // Unlock Logic
          if (id === 'LEVEL_10') {
              // Unlock Pentominos
              newUnlockedShapes = [...new Set([...newUnlockedShapes, 'P5_P', 'P5_X', 'P5_F'])] as TetrominoType[];
          } else if (id === 'SCORE_100K') {
              // Unlock Trominos
              newUnlockedShapes = [...new Set([...newUnlockedShapes, 'T3_L', 'T3_I'])] as TetrominoType[];
          } else if (id === 'COMBO_5') {
              // Unlock Micro
              newUnlockedShapes = [...new Set([...newUnlockedShapes, 'M1', 'D2_H', 'D2_V'])] as TetrominoType[];
          }

          set((state) => ({
              stats: {
                  ...state.stats,
                  unlockedAchievements: [...state.stats.unlockedAchievements, id],
                  unlockedShapes: newUnlockedShapes
              }
          }));
          return true;
      },
      toggleShape: (shape) => set((state) => {
          if (STANDARD_SHAPES.includes(shape)) return state; // Cannot disable standard shapes
          
          const isEnabled = state.stats.enabledShapes.includes(shape);
          const newEnabled = isEnabled
              ? state.stats.enabledShapes.filter(s => s !== shape)
              : [...state.stats.enabledShapes, shape];
              
          return {
              stats: {
                  ...state.stats,
                  enabledShapes: newEnabled
              }
          };
      }),
      unlockAbility: (ability) => set((state) => ({
          stats: { ...state.stats, unlockedAbilities: [...new Set([...state.stats.unlockedAbilities, ability])] }
      })),
      equipAbility: (ability) => set((state) => {
          if (state.stats.equippedAbilities.length >= 3 || state.stats.equippedAbilities.includes(ability)) return state;
          return { stats: { ...state.stats, equippedAbilities: [...state.stats.equippedAbilities, ability] }};
      }),
      unequipAbility: (ability) => set((state) => ({
          stats: { ...state.stats, equippedAbilities: state.stats.equippedAbilities.filter(a => a !== ability) }
      })),
    }),
    {
      name: 'tetrios-profile-store',
      version: 5, // Version bumped for abilities
      storage: createJSONStorage(() => safeStorage),
      migrate: (persistedState: any, currentVersion) => {
        if (currentVersion < 2) {
          if (!persistedState.stats.highScores) persistedState.stats.highScores = {};
          if (persistedState.stats.highScore === undefined) persistedState.stats.highScore = 0;
        }
        if (currentVersion < 3) {
            if (!persistedState.stats.unlockedAchievements) persistedState.stats.unlockedAchievements = [];
        }
        if (currentVersion < 4) {
            if (!persistedState.stats.unlockedShapes) persistedState.stats.unlockedShapes = [...STANDARD_SHAPES];
            if (!persistedState.stats.enabledShapes) persistedState.stats.enabledShapes = [...STANDARD_SHAPES];
        }
        if (currentVersion < 5) {
            if (!persistedState.stats.unlockedAbilities) persistedState.stats.unlockedAbilities = ['COLOR_SWAP'];
            if (!persistedState.stats.equippedAbilities) persistedState.stats.equippedAbilities = ['COLOR_SWAP'];
        }
        return persistedState as ProfileState;
      },
    }
  )
);
