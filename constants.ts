
import { Tetromino, TetrominoType } from './types';

export const STAGE_WIDTH = 10;
export const STAGE_HEIGHT = 20;

// Scoring Rules
export const SCORES = {
  SINGLE: 100,
  DOUBLE: 300,
  TRIPLE: 500,
  TETRIS: 800,
  TSPIN: 400,
  TSPIN_SINGLE: 800,
  TSPIN_DOUBLE: 1200,
  TSPIN_TRIPLE: 1600,
  BACK_TO_BACK_MULTIPLIER: 1.5,
  COMBO_FACTOR: 50,
  SOFT_DROP: 1,
  HARD_DROP: 2,
};

export const COLORS: Record<TetrominoType, string> = {
  I: 'rgb(6, 182, 212)', // Cyan
  J: 'rgb(59, 130, 246)', // Blue
  L: 'rgb(249, 115, 22)', // Orange
  O: 'rgb(234, 179, 8)', // Yellow
  S: 'rgb(34, 197, 94)', // Green
  T: 'rgb(168, 85, 247)', // Purple
  Z: 'rgb(239, 68, 68)', // Red
  G: 'rgb(100, 116, 139)', // Gray (Garbage)
};

export const TETROMINOS: Record<string, Tetromino> = {
  0: { shape: [[0]], color: 'rgb(0, 0, 0)', type: 'I' },
  I: { type: 'I', shape: [[0, 'I', 0, 0], [0, 'I', 0, 0], [0, 'I', 0, 0], [0, 'I', 0, 0]], color: COLORS.I },
  J: { type: 'J', shape: [[0, 'J', 0], [0, 'J', 0], ['J', 'J', 0]], color: COLORS.J },
  L: { type: 'L', shape: [[0, 'L', 0], [0, 'L', 0], [0, 'L', 'L']], color: COLORS.L },
  O: { type: 'O', shape: [['O', 'O'], ['O', 'O']], color: COLORS.O },
  S: { type: 'S', shape: [[0, 'S', 'S'], ['S', 'S', 0], [0, 0, 0]], color: COLORS.S },
  T: { type: 'T', shape: [[0, 0, 0], ['T', 'T', 'T'], [0, 'T', 0]], color: COLORS.T },
  Z: { type: 'Z', shape: [['Z', 'Z', 0], [0, 'Z', 'Z'], [0, 0, 0]], color: COLORS.Z },
  G: { type: 'G', shape: [['G']], color: COLORS.G }
};

export const KICKS = {
  'JLSTZ': [
    [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]]
  ],
  'I': [
    [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
    [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]]
  ]
};

export interface PuzzleDefinition {
    name: string;
    description: string;
    bag: TetrominoType[];
    // Visual representation of the board (Bottom rows up)
    // 'X' = Garbage, '.' = Empty
    layout: string[]; 
}

export const PUZZLE_LEVELS: PuzzleDefinition[] = [
    {
        name: "The Well",
        description: "Clear 4 lines with the I-piece to win.",
        bag: ['I', 'I', 'I', 'I', 'I'],
        layout: [
            "X.XXXXXXXX",
            "X.XXXXXXXX",
            "X.XXXXXXXX",
            "X.XXXXXXXX",
        ]
    },
    {
        name: "T-Spin Tutor",
        description: "Perform a T-Spin Double to clear.",
        bag: ['T', 'T', 'T'],
        layout: [
            "XX.XXXXXXX",
            "XX...XXXXX",
            "XX.XXXXXXX",
        ]
    },
    {
        name: "Combo Starter",
        description: "Clear the board using the provided sequence.",
        bag: ['L', 'J', 'Z', 'S', 'O'],
        layout: [
            "XX.XXXXXXX",
            "XX.XXXXXXX",
            "XXXX.XXXXX",
            "XXXX.XXXXX",
        ]
    }
];
