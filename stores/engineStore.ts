
import { create } from 'zustand';
import { GameStats, TetrominoType, GameState, MoveScore, BoosterType, GameMode, Difficulty } from '../types';

interface EngineState {
  // Core Metrics
  stats: GameStats;
  gameState: GameState;
  gameMode: GameMode;
  difficulty: Difficulty;
  
  // Board & Pieces
  nextQueue: TetrominoType[];
  heldPiece: TetrominoType | null;
  canHold: boolean;
  lastHoldTime: number; // Timestamp of last hold action
  
  // Gameplay Flags
  comboCount: number;
  isBackToBack: boolean;
  garbagePending: number;
  pieceIsGrounded: boolean;
  flippedGravity: boolean;
  wildcardPieceActive: boolean;
  dangerLevel: number;
  
  // Zone State
  zoneActive: boolean;
  focusGauge: number;
  
  // Input State for Visuals
  inputVector: { x: number; y: number }; // x: -1/0/1, y: -1/0/1 (Soft Drop)
  
  // Selection States
  isSelectingBombRows: boolean;
  bombRowsToClear: number;
  isSelectingLine: boolean;
  selectedLineToClear: number | null;
  
  // AI & Coach
  aiHint: MoveScore | null;
  missedOpportunity: MoveScore | null;

  // Actions (Setters)
  setStats: (stats: Partial<GameStats>) => void;
  setGameState: (state: GameState) => void;
  setQueue: (queue: TetrominoType[]) => void;
  setHold: (piece: TetrominoType | null, canHold: boolean) => void;
  setGameMode: (gameMode: GameMode, difficulty: Difficulty) => void;
  
  // Generic updates to reduce boilerplate
  updateState: (payload: Partial<EngineState>) => void;
}

const INITIAL_STATS: GameStats = {
    score: 0, rows: 0, level: 0, time: 0,
    movesTaken: 0, gemsCollected: 0, bombsDefused: 0, tetrisesAchieved: 0, combosAchieved: 0,
    isFrenzyActive: false, frenzyTimer: 0, slowTimeActive: false, slowTimeTimer: 0,
    wildcardAvailable: false, bombBoosterReady: false, lineClearerActive: false,
    flippedGravityActive: false, flippedGravityTimer: 0,
    focusGauge: 0, isZoneActive: false, zoneTimer: 0, zoneLines: 0,
    maxB2BChain: 0, currentB2BChain: 0
};

export const useEngineStore = create<EngineState>((set) => ({
  stats: INITIAL_STATS,
  gameState: 'MENU',
  gameMode: 'MARATHON',
  difficulty: 'MEDIUM',
  nextQueue: [],
  heldPiece: null,
  canHold: true,
  lastHoldTime: 0,
  comboCount: -1,
  isBackToBack: false,
  garbagePending: 0,
  pieceIsGrounded: false,
  flippedGravity: false,
  wildcardPieceActive: false,
  dangerLevel: 0,
  inputVector: { x: 0, y: 0 },
  isSelectingBombRows: false,
  bombRowsToClear: 0,
  isSelectingLine: false,
  selectedLineToClear: null,
  aiHint: null,
  missedOpportunity: null,
  zoneActive: false,
  focusGauge: 0,

  setStats: (newStats) => set((state) => {
      const mergedStats = { ...state.stats, ...newStats };
      // Also lift up key zone stats for direct access if needed, though consumers should use stats.*
      return { 
          stats: mergedStats,
          focusGauge: mergedStats.focusGauge,
          zoneActive: mergedStats.isZoneActive
      };
  }),
  setGameState: (gameState) => set({ gameState }),
  setQueue: (nextQueue) => set({ nextQueue }),
  setHold: (heldPiece, canHold) => set({ heldPiece, canHold, lastHoldTime: Date.now() }),
  setGameMode: (gameMode, difficulty) => set({ gameMode, difficulty }),
  updateState: (payload) => set(payload),
}));

// Export vanilla store for non-React usage (GameCore)
export const engineStore = useEngineStore;
