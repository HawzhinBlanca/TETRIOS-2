
import { Board, Player, TetrominoType, MoveScore } from './types';

export interface GameState {
    // Core Data
    board: Board;
    boardRevision: number; // Optimization: Track board changes for render skipping
    player: Player;
    queue: TetrominoType[];
    hold: {
        piece: TetrominoType | null;
        canHold: boolean;
        charge: number; 
        entryTime: number; 
    };
    piecePool?: TetrominoType[]; // Custom set of pieces for this game session
    rngState: number; // Added for Rewind Determinism
    
    // Metrics
    score: number;
    lines: number;
    level: number;
    combo: number;
    backToBack: boolean;
    
    // Physics & Timing
    gravity: {
        speed: number; // ms per row
        dropTimer: number;
        lockTimer: number;
    };
    
    // Flags
    flags: {
        isGrounded: boolean;
        isLocking: boolean;
        isPaused: boolean;
        isGameOver: boolean;
        isZone: boolean;
    };

    // AI/Assist
    aiHint: MoveScore | null;
}

export type GameEffect = 
    | { type: 'AUDIO', event: string, payload?: any }
    | { type: 'VISUAL', event: string, payload?: any }
    | { type: 'UI', event: string, payload?: any }
    | { type: 'ACHIEVEMENT', id: string }
    | { type: 'LOCK', payload: TetrominoType }
    | { type: 'GAME_OVER' };

export interface TickResult {
    state: GameState;
    effects: GameEffect[];
}
