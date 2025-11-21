



import { Tetromino, TetrominoType, AdventureWorld, LevelObjectiveType, InitialBoardModifierType, GameGimmickType, Booster, BoosterType } from './types';

export const STAGE_WIDTH = 10;
export const STAGE_HEIGHT = 20;

// Default Game Tuning
export const DEFAULT_DAS = 133; // Delayed Auto Shift (ms)
export const DEFAULT_ARR = 10;  // Auto Repeat Rate (ms)
export const DEFAULT_GAMESPEED = 1; // Gravity Multiplier (1x)

// Scoring Rules
export const SCORES = {
  SINGLE: 100,
  DOUBLE: 300,
  TRIPLE: 500,
  TETRIS: 800,
  TSPIN: 400, // T-Spin Zero
  TSPIN_SINGLE: 800,
  TSPIN_DOUBLE: 1200,
  TSPIN_TRIPLE: 1600,
  BACK_TO_BACK_MULTIPLIER: 1.5,
  COMBO_FACTOR: 50,
  SOFT_DROP: 1,
  HARD_DROP: 2,
  GEM_COLLECT_BONUS: 250,
  BOMB_DEFUZE_BONUS: 500, // This is for on-board bombs cleared
  FRENZY_MULTIPLIER: 2, // Score multiplier during frenzy
  POWERUP_NUKE_BONUS: 1500, // Bonus for using Nuke
  POWERUP_LASER_BONUS: 700, // Bonus for using Laser
  BOOSTER_BOMB_CLEAR_BONUS: 1000, // Bonus for using Bomb Booster
  BOOSTER_LINE_CLEARER_BONUS: 750, // New: Bonus for using Line Clearer Booster
  POWERUP_NUKE_BLOCK_BONUS: 2500, // Bonus for clearing Nuke block
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
  WILDCARD_SHAPE: 'rgb(255, 255, 255)', // White for wildcard selection
};

export const MODIFIER_COLORS = {
    GEM: 'rgb(236, 72, 153)', // Pink
    BOMB: 'rgb(239, 68, 68)', // Red (for on-board bombs)
    BOMB_TEXT: '#ffffff',
    ICE: 'rgb(100, 160, 200)', // Light Blue-Gray for Ice
    CRACKED_ICE: 'rgb(150, 190, 220)', // Slightly lighter for cracked ice
    WILDCARD_BLOCK: 'rgb(234, 179, 8)', // Yellow
    LASER_BLOCK: 'rgb(6, 182, 212)', // Cyan
    NUKE_BLOCK: 'rgb(255, 0, 128)', // Pink/Magenta for Nuke
};

export const TETROMINOS: Record<TetrominoType | 0, Tetromino> = {
  0: { shape: [[0]], color: 'rgb(0, 0, 0)', type: 'I' }, // Dummy for empty cells
  I: { type: 'I', shape: [[0, 'I', 0, 0], [0, 'I', 0, 0], [0, 'I', 0, 0], [0, 'I', 0, 0]], color: COLORS.I },
  J: { type: 'J', shape: [[0, 'J', 0], [0, 'J', 0], ['J', 'J', 0]], color: COLORS.J },
  L: { type: 'L', shape: [[0, 'L', 0], [0, 'L', 0], [0, 'L', 'L']], color: COLORS.L },
  O: { type: 'O', shape: [['O', 'O'], ['O', 'O']], color: COLORS.O },
  S: { type: 'S', shape: [[0, 'S', 'S'], ['S', 'S', 0], [0, 0, 0]], color: COLORS.S },
  T: { type: 'T', shape: [[0, 0, 0], ['T', 'T', 'T'], [0, 'T', 0]], color: COLORS.T },
  Z: { type: 'Z', shape: [['Z', 'Z', 0], [0, 'Z', 'Z'], [0, 0, 0]], color: COLORS.Z },
  G: { type: 'G', shape: [['G']], color: COLORS.G }, // Single garbage block
  WILDCARD_SHAPE: { type: 'WILDCARD_SHAPE', shape: [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], color: COLORS.WILDCARD_SHAPE }, // Placeholder shape
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

// Visual Effect Constants
export const SHAKE_DURATION_SOFT_MS = 300;
export const SHAKE_DURATION_HARD_MS = 500;
export const FLASH_DURATION_MS = 200;
export const PARTICLE_AMOUNT_SOFT = 10;
export const PARTICLE_AMOUNT_MEDIUM = 30;
export const PARTICLE_AMOUNT_HARD = 50;

// Frenzy Mode Constants
export const FRENZY_DURATION_MS = 8000; // 8 seconds
export const FRENZY_COMBO_THRESHOLD = 2; // Trigger frenzy at 3+ combo (0-indexed combo count)

// Booster Durations
export const SLOW_TIME_BOOSTER_DURATION_MS = 30000; // 30 seconds
export const FLIPPED_GRAVITY_BOOSTER_DURATION_MS = 15000; // New: 15 seconds for flipped gravity

// BLITZ Mode Constants
export const BLITZ_DURATION_MS = 120 * 1000; // 2 minutes (120 seconds)
export const BLITZ_INITIAL_DROPTIME = 300; // Faster initial drop time (ms)
export const BLITZ_SPEED_THRESHOLDS = [ // Score thresholds for speed-ups
    { score: 5000, speedFactor: 0.85, message: "SPEED UP x1.5!" },
    { score: 15000, speedFactor: 0.8, message: "SPEED UP x2!" },
    { score: 30000, speedFactor: 0.75, message: "CRITICAL SPEED!" },
    { score: 50000, speedFactor: 0.7, message: "INSANE!" },
];
export const BLITZ_POWERUP_SPAWN_CHANCE_MULTIPLIER = 2; // Double the chance of power-ups

// Survival Mode Constants
export const SURVIVAL_INITIAL_GARBAGE_INTERVAL = 10000; // 10s
export const SURVIVAL_MIN_GARBAGE_INTERVAL = 1000; // 1s
export const SURVIVAL_GARBAGE_DECREMENT = 500; // 0.5s decrease per interval

// Combo Master Mode Constants
export const COMBO_MASTER_INITIAL_TIME = 30; // 30s
export const COMBO_MASTER_TIME_BONUS_BASE = 2; // 2s per clear
export const COMBO_MASTER_TIME_BONUS_MULTIPLIER = 1.5; // bonus = base + (combo * multiplier)

// --- GAME ECONOMY ---
export const DEFAULT_COINS = 500; // Starting coins for new players
export const LEVEL_PASS_COIN_REWARD = 100; // Base coins for passing any level
export const STAR_COIN_BONUS = 50; // Additional coins per star
export const MAX_STARS_PER_LEVEL = 3;

export const BOOSTERS: Record<BoosterType, Booster> = {
    BOMB_BOOSTER: {
        type: 'BOMB_BOOSTER',
        name: 'Bomb Booster',
        description: 'Activate to clear a chosen 2-3 row section of the matrix. One-time use per level.',
        icon: '💣',
        initialQuantity: 1, // Start with one free bomb booster
        cost: 150,
    },
    SLOW_TIME_BOOSTER: {
        type: 'SLOW_TIME_BOOSTER',
        name: 'Slow Time',
        description: 'Temporarily reduce Tetrimino falling speed for the first 30 seconds of the level.',
        icon: '⏳',
        initialQuantity: 0,
        cost: 200,
    },
    PIECE_SWAP_BOOSTER: {
        type: 'PIECE_SWAP_BOOSTER',
        name: 'Piece Swap+',
        description: 'Allows an extra hold slot, or more flexible piece swapping during the level.',
        icon: '🔄',
        initialQuantity: 0,
        cost: 250,
    },
    LINE_CLEARER_BOOSTER: {
        type: 'LINE_CLEARER_BOOSTER',
        name: 'Line Clearer',
        description: 'Instantly clears one line of your choice at a crucial moment. Activated by tap.',
        icon: '🧹',
        initialQuantity: 0,
        cost: 300,
    },
    FLIPPED_GRAVITY_BOOSTER: {
        type: 'FLIPPED_GRAVITY_BOOSTER',
        name: 'Flipped Gravity',
        description: 'Invert gravity for 15 seconds, making pieces fall upwards. Advanced tactic.',
        icon: '🙃',
        initialQuantity: 0,
        cost: 400,
    },
};

// --- ADVENTURE CAMPAIGN DATA ---
export const ADVENTURE_CAMPAIGN: AdventureWorld[] = [
    {
        id: 'world_1',
        name: 'Neon District',
        description: 'The journey begins in the heart of the city.',
        themeColor: '#06b6d4', // Cyan
        levels: [
            {
                id: 'lvl_1_1', index: 0, worldId: 'world_1',
                title: 'Initialize', description: 'Clear 10 lines in 40 moves.',
                objective: { type: 'LINES', target: 10 },
                constraints: { movesLimit: 40 },
                style: { background: 'linear-gradient(to bottom, #0f172a, #082f49)', accentColor: '#22d3ee' },
                storyStart: [{ id: 's1', speaker: 'AI Guide', text: 'Welcome, Operator. The matrix is unstable. Clear 10 lines in 40 moves to stabilize the grid.', side: 'left', avatar: '🤖' }],
                rewards: { coins: 100 }
            },
            {
                id: 'lvl_1_2', index: 1, worldId: 'world_1',
                title: 'Speed Test', description: 'Survive for 60 seconds.',
                objective: { type: 'TIME_SURVIVAL', target: 60 },
                constraints: { timeLimit: 60 }, // This is the total time for the objective
                style: { background: 'linear-gradient(to bottom, #1e1b4b, #312e81)', accentColor: '#818cf8' },
                storyStart: [{ id: 's2', speaker: 'AI Guide', text: 'Gravity systems are fluctuating. Hold your ground for 60 seconds.', side: 'left', avatar: '🤖' }],
                rewards: { coins: 120, boosters: [{ type: 'SLOW_TIME_BOOSTER', amount: 1 }] }
            },
            {
                id: 'lvl_1_3', index: 2, worldId: 'world_1',
                title: 'Gem Rush', description: 'Collect 3 Gems to power up the city.',
                objective: { type: 'GEMS', target: 3 },
                initialBoard: [{ type: 'GEMS', amount: 3 }],
                constraints: { movesLimit: 30 },
                style: { background: 'linear-gradient(to bottom, #2d132c, #4a1941)', accentColor: '#ec4899' },
                storyStart: [{ id: 's7', speaker: 'AI Guide', text: 'New objective: collect 3 power gems to reactivate the city grid within 30 moves!', side: 'left', avatar: '🤖' }],
                rewards: { coins: 150 }
            },
            {
                id: 'lvl_1_4', index: 3, worldId: 'world_1',
                title: 'Bomb Squad', description: 'Defuse 2 Bombs before they detonate.',
                objective: { type: 'BOMBS', target: 2 },
                initialBoard: [{ type: 'BOMBS', amount: 2, modifierProps: { timer: 10 } }], // Bombs with 10 hits (these are on-board bombs)
                constraints: { movesLimit: 20 },
                style: { background: 'linear-gradient(to bottom, #2b1111, #4d1818)', accentColor: '#f87171' },
                storyStart: [{ id: 's8', speaker: 'AI Guide', text: 'Hostiles have planted bombs! Clear 2 bombs within 20 moves or face total grid collapse!', side: 'left', avatar: '🤖' }],
                rewards: { coins: 150 }
            },
            {
                id: 'lvl_1_5', index: 4, worldId: 'world_1',
                title: 'Wildcard Challenge', description: 'Collect a Wildcard block and use it.',
                objective: { type: 'GEMS', target: 1 }, // Assuming wildcard is like a gem for objective
                initialBoard: [{ type: 'WILDCARD_BLOCK', amount: 1 }],
                constraints: { movesLimit: 25 },
                style: { background: 'linear-gradient(to bottom, #10172a, #202c50)', accentColor: '#a78bfa' },
                storyStart: [{ id: 's9', speaker: 'AI Guide', text: 'A mysterious signal detected! Capture the wildcard block to unlock new strategies.', side: 'left', avatar: '🤖' }],
                rewards: { coins: 180, boosters: [{ type: 'PIECE_SWAP_BOOSTER', amount: 1 }] }
            },
            {
                id: 'lvl_1_6', index: 5, worldId: 'world_1',
                title: 'Laser Defense', description: 'Clear a Laser Block before the timer runs out.',
                objective: { type: 'LINES', target: 5 }, // Clear 5 lines after activating laser to show power
                initialBoard: [{ type: 'LASER_BLOCK', amount: 1 }],
                constraints: { timeLimit: 45 },
                style: { background: 'linear-gradient(to bottom, #001f2e, #003a55)', accentColor: '#00d4ff' },
                storyStart: [{ id: 's10', speaker: 'AI Guide', text: 'A laser grid is forming! Activate the laser block and clear lines quickly to prevent a meltdown!', side: 'left', avatar: '🤖' }],
                rewards: { coins: 200, boosters: [{ type: 'LINE_CLEARER_BOOSTER', amount: 1 }] }
            },
            {
                id: 'lvl_1_BOSS', index: 6, worldId: 'world_1',
                title: 'GRID OVERLORD', description: 'Defeat the Grid Overlord!',
                objective: { type: 'BOSS', target: 1000 }, // Boss with 1000 HP
                boss: { name: 'Grid Overlord', ability: 'GARBAGE_RAIN', interval: 5000 },
                gimmicks: [{ type: 'FLIPPED_GRAVITY', config: { flipped: false } }], // Initial state
                style: { background: 'linear-gradient(to bottom, #200a0a, #4a0000)', accentColor: '#ef4444' },
                storyStart: [{ id: 's3', speaker: 'AI Guide', text: 'WARNING! The Grid Overlord has appeared! Destroy it before it consumes the entire network!', side: 'left', avatar: '🤖' }],
                storyEnd: [{ id: 'e1', speaker: 'AI Guide', text: 'Success! The Grid Overlord has been neutralized. Proceed to the next world.', side: 'left', avatar: '🤖' }],
                rewards: { coins: 500 }
            },
        ]
    },
    // Add more worlds here
];