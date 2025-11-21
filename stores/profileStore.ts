
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ProfileStats {
  totalGamesPlayed: number;
  totalScore: number;
  totalLinesCleared: number;
  highestLevelReached: number;
}

interface ProfileState {
  playerName: string;
  stats: ProfileStats;
  setPlayerName: (name: string) => void;
  updateStats: (gameStats: { score: number; rows: number; level: number }) => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      playerName: 'Operator',
      stats: {
        totalGamesPlayed: 0,
        totalScore: 0,
        totalLinesCleared: 0,
        highestLevelReached: 0,
      },
      setPlayerName: (name) => set({ playerName: name }),
      updateStats: (gameStats) => set((state) => ({
        stats: {
          totalGamesPlayed: state.stats.totalGamesPlayed + 1,
          totalScore: state.stats.totalScore + gameStats.score,
          totalLinesCleared: state.stats.totalLinesCleared + gameStats.rows,
          highestLevelReached: Math.max(state.stats.highestLevelReached, gameStats.level),
        }
      })),
    }),
    {
      name: 'tetrios-profile-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
