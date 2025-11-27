
import { TetrominoType, Tetromino, Booster, Achievement, Difficulty, GameMode, AdventureWorld, AbilityConfig, PuzzleDefinition, ColorblindMode } from './types';

export const STAGE_WIDTH = 11;
export const STAGE_HEIGHT = 22;

export const COLORS: Record<string, string> = {
  I: 'rgb(6, 182, 212)', // Cyan
  J: 'rgb(59, 130, 246)', // Blue
  L: 'rgb(249, 115, 22)', // Orange
  O: 'rgb(234, 179, 8)',  // Yellow
  S: 'rgb(34, 197, 94)',  // Green
  T: 'rgb(168, 85, 247)', // Purple
  Z: 'rgb(239, 68, 68)',  // Red
  WILDCARD_SHAPE: 'rgb(255, 255, 255)',
  M1: '#ec4899',
  D2: '#f472b6',
  T3: '#fb7185',
  P5: '#f43f5e',
  D2_H: '#f472b6',
  D2_V: '#f472b6',
  T3_L: '#fb7185',
  T3_I: '#fb7185',
  P5_P: '#f43f5e',
  P5_X: '#f43f5e',
  P5_F: '#f43f5e',
};

// Accessible Palettes (Okabe & Ito adapted)
export const PALETTES: Record<ColorblindMode, Record<string, string>> = {
    NORMAL: { ...COLORS },
    PROTANOPIA: {
        I: '#56B4E9', // Sky Blue
        J: '#0072B2', // Blue
        L: '#E69F00', // Orange
        O: '#F0E442', // Yellow
        S: '#009E73', // Bluish Green
        T: '#CC79A7', // Reddish Purple
        Z: '#D55E00', // Vermilion
        WILDCARD_SHAPE: '#FFFFFF',
        M1: '#CC79A7', D2: '#CC79A7', T3: '#CC79A7', P5: '#CC79A7',
        D2_H: '#CC79A7', D2_V: '#CC79A7', T3_L: '#CC79A7', T3_I: '#CC79A7',
        P5_P: '#CC79A7', P5_X: '#CC79A7', P5_F: '#CC79A7'
    },
    DEUTERANOPIA: {
        // Similar to Protanopia, this high contrast palette works well for both
        I: '#56B4E9', 
        J: '#0072B2', 
        L: '#E69F00', 
        O: '#F0E442', 
        S: '#009E73', 
        T: '#CC79A7', 
        Z: '#D55E00',
        WILDCARD_SHAPE: '#FFFFFF',
        M1: '#CC79A7', D2: '#CC79A7', T3: '#CC79A7', P5: '#CC79A7',
        D2_H: '#CC79A7', D2_V: '#CC79A7', T3_L: '#CC79A7', T3_I: '#CC79A7',
        P5_P: '#CC79A7', P5_X: '#CC79A7', P5_F: '#CC79A7'
    },
    TRITANOPIA: {
        I: '#66CCEE', // Cyan/Blue
        J: '#228833', // Green (distinct from I)
        L: '#EE6677', // Pink/Red
        O: '#CCBB44', // Dark Yellow/Khaki
        S: '#4477AA', // Blue
        T: '#AA3377', // Purple
        Z: '#AA6677', // Rose
        WILDCARD_SHAPE: '#FFFFFF',
        M1: '#AA3377', D2: '#AA3377', T3: '#AA3377', P5: '#AA3377',
        D2_H: '#AA3377', D2_V: '#AA3377', T3_L: '#AA3377', T3_I: '#AA3377',
        P5_P: '#AA3377', P5_X: '#AA3377', P5_F: '#AA3377'
    }
};

export const MODIFIER_COLORS = {
    GEM: 'rgb(236, 72, 153)', 
    BOMB: 'rgb(239, 68, 68)', 
    BOMB_TEXT: '#ffffff',
    ICE: 'rgb(96, 165, 250)', 
    CRACKED_ICE: 'rgb(191, 219, 254)', 
    WILDCARD_BLOCK: 'rgb(234, 179, 8)', 
    LASER_BLOCK: 'rgb(6, 182, 212)', 
    NUKE_BLOCK: 'rgb(255, 0, 128)', 
    BEDROCK: 'rgb(100, 116, 139)', // Slate 500
    SLOW_BLOCK: 'rgb(99, 102, 241)', // Indigo 500
    MULTIPLIER_BLOCK: 'rgb(234, 179, 8)', // Yellow 500
    FREEZE_BLOCK: 'rgb(165, 243, 252)', // Cyan 200 (Ice)
    DRILL_BLOCK: 'rgb(249, 115, 22)', // Orange 500
};

export const TETROMINOS: Record<string, Tetromino> = {
  0: { shape: [[0]], color: '0, 0, 0', type: 'I' }, // Dummy
  I: {
    shape: [
      [0, 'I', 0, 0],
      [0, 'I', 0, 0],
      [0, 'I', 0, 0],
      [0, 'I', 0, 0],
    ],
    color: COLORS.I,
    type: 'I'
  },
  J: {
    shape: [
      [0, 'J', 0],
      [0, 'J', 0],
      ['J', 'J', 0],
    ],
    color: COLORS.J,
    type: 'J'
  },
  L: {
    shape: [
      [0, 'L', 0],
      [0, 'L', 0],
      [0, 'L', 'L'],
    ],
    color: COLORS.L,
    type: 'L'
  },
  O: {
    shape: [
      ['O', 'O'],
      ['O', 'O'],
    ],
    color: COLORS.O,
    type: 'O'
  },
  S: {
    shape: [
      [0, 'S', 'S'],
      ['S', 'S', 0],
      [0, 0, 0],
    ],
    color: COLORS.S,
    type: 'S'
  },
  T: {
    shape: [
      [0, 0, 0],
      ['T', 'T', 'T'],
      [0, 'T', 0],
    ],
    color: COLORS.T,
    type: 'T'
  },
  Z: {
    shape: [
      ['Z', 'Z', 0],
      [0, 'Z', 'Z'],
      [0, 0, 0],
    ],
    color: COLORS.Z,
    type: 'Z'
  },
  WILDCARD_SHAPE: { shape: [[0]], color: COLORS.WILDCARD_SHAPE, type: 'WILDCARD_SHAPE' },
  // Extended shapes
  M1: { shape: [['M1']], color: COLORS.M1, type: 'M1' },
  D2: { shape: [['D2', 'D2']], color: COLORS.D2, type: 'D2' },
  D2_H: { shape: [['D2_H', 'D2_H']], color: COLORS.D2_H, type: 'D2_H' },
  D2_V: { shape: [['D2_V'], ['D2_V']], color: COLORS.D2_V, type: 'D2_V' },
  T3: { shape: [['T3', 'T3', 'T3']], color: COLORS.T3, type: 'T3' },
  T3_L: { shape: [['T3_L', 0], ['T3_L', 'T3_L']], color: COLORS.T3_L, type: 'T3_L' },
  T3_I: { shape: [['T3_I'], ['T3_I'], ['T3_I']], color: COLORS.T3_I, type: 'T3_I' },
  P5: { shape: [['P5', 'P5', 'P5', 'P5', 'P5']], color: COLORS.P5, type: 'P5' },
  P5_P: { shape: [['P5_P', 'P5_P'], ['P5_P', 'P5_P'], ['P5_P', 0]], color: COLORS.P5_P, type: 'P5_P' },
  P5_X: { shape: [[0, 'P5_X', 0], ['P5_X', 'P5_X', 'P5_X'], [0, 'P5_X', 0]], color: COLORS.P5_X, type: 'P5_X' },
  P5_F: { shape: [[0, 'P5_F', 'P5_F'], ['P5_F', 'P5_F', 0], [0, 'P5_F', 0]], color: COLORS.P5_F, type: 'P5_F' },
};

// Explicit Type Definition for SRS Kicks
type KickTable = Record<string, [number, number][][]>;

export const KICKS: KickTable = {
    // SRS Kick data... 
    // Organized by [Rotation Index (0->1, 1->2 etc..)] -> [Test 1, Test 2, Test 3, Test 4, Test 5]
    // Each test is [xOffset, yOffset]
    I: [
      [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
      [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
      [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
      [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]]
    ],
    JLSTZ: [
      [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
      [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
      [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
      [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]]
    ]
};

export const DEFAULT_DAS = 133;
export const DEFAULT_ARR = 10;
export const DEFAULT_GAMESPEED = 1.0;

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
    GEM_COLLECT_BONUS: 500,
    BOMB_DEFUZE_BONUS: 1000,
    BOOSTER_LINE_CLEARER_BONUS: 500,
    BOOSTER_BOMB_CLEAR_BONUS: 500,
    POWERUP_NUKE_BLOCK_BONUS: 2000,
    MONO_COLOR_BONUS: 200,
    PATTERN_BONUS: 300,
    FRENZY_MULTIPLIER: 2,
    ZONE_CLEAR_BONUS: 1000
};

export const EXTENDED_SHAPES: TetrominoType[] = ['M1', 'D2', 'T3', 'P5', 'D2_H', 'D2_V', 'T3_L', 'T3_I', 'P5_P', 'P5_X', 'P5_F'];

export const BLITZ_INITIAL_DROPTIME = 1000;
export const SURVIVAL_INITIAL_GARBAGE_INTERVAL = 10000;
export const SURVIVAL_MIN_GARBAGE_INTERVAL = 2000;
export const SURVIVAL_GARBAGE_DECREMENT = 500;

export const FRENZY_DURATION_MS = 10000;
export const FRENZY_COMBO_THRESHOLD = 4;
export const FLASH_DURATION_MS = 300;
export const SHAKE_DURATION_HARD_MS = 400;
export const SHAKE_DURATION_SOFT_MS = 200;

export const PARTICLE_AMOUNT_MEDIUM = 20;
export const PARTICLE_AMOUNT_SOFT = 10;

export const BLITZ_DURATION_MS = 120000;
export const BLITZ_SPEED_THRESHOLDS = [
    { score: 5000, speedFactor: 0.8, message: 'SPEED UP!' },
    { score: 10000, speedFactor: 0.8, message: 'HYPER SPEED!' },
    { score: 20000, speedFactor: 0.8, message: 'LUDICROUS SPEED!' },
];

export const DEFAULT_CONTROLS = {
    moveLeft: ['ArrowLeft', 'a'],
    moveRight: ['ArrowRight', 'd'],
    softDrop: ['ArrowDown', 's'],
    hardDrop: [' ', 'w'], 
    rotateCW: ['ArrowUp', 'x', 'k'],
    rotateCCW: ['z', 'j', 'Control'],
    hold: ['c', 'Shift'],
    zone: ['v', 'Enter'],
    rewind: ['r'],
    ability1: ['1'],
    ability2: ['2'],
    ability3: ['3']
};

export const DIFFICULTY_SETTINGS: Record<string, { label: string, das: number, arr: number, color: string }> = {
    EASY: { label: 'Easy', das: 200, arr: 30, color: 'text-green-400' },
    MEDIUM: { label: 'Medium', das: 133, arr: 10, color: 'text-yellow-400' },
    HARD: { label: 'Hard', das: 100, arr: 0, color: 'text-red-400' }
};

export const GAME_MODES_CONFIG: { id: GameMode; label: string; description: string; icon: string; color: string }[] = [
    { id: 'MARATHON', label: 'Marathon', description: 'Classic Tetris. 150 Lines to win. Speed increases with levels.', icon: 'Trophy', color: 'text-cyan-400' },
    { id: 'DAILY', label: 'Daily Challenge', description: 'Unique seed every day. Compete on the same board as everyone else.', icon: 'Calendar', color: 'text-fuchsia-400' },
    { id: 'BLITZ', label: 'Blitz', description: 'Fast-paced action! Clear for points as the game gets faster over 2 minutes.', icon: 'Zap', color: 'text-yellow-400' },
    { id: 'COMBO_MASTER', label: 'Combo Master', description: 'Keep the chain alive! Time only increases when you clear lines in a combo.', icon: 'Flame', color: 'text-orange-500' },
    { id: 'SPRINT', label: 'Sprint', description: 'Clear 40 lines as fast as possible.', icon: 'Clock', color: 'text-green-400' },
    { id: 'SURVIVAL', label: 'Survival', description: 'Resist incoming garbage lines. Don\'t top out!', icon: 'Skull', color: 'text-red-400' },
    { id: 'ADVENTURE', label: 'Adventure', description: 'Campaign mode with unique challenges and bosses.', icon: 'Map', color: 'text-purple-400' },
];

export const BOOSTERS: Record<string, Booster> = {
    BOMB_BOOSTER: { type: 'BOMB_BOOSTER', name: 'Bomb', description: 'Clear specific rows on command.', icon: '💣', cost: 1000, initialQuantity: 1 },
    SLOW_TIME_BOOSTER: { type: 'SLOW_TIME_BOOSTER', name: 'Time Dilation', description: 'Slows gravity by 50% for 30s.', icon: '⏰', cost: 800, initialQuantity: 1 },
    PIECE_SWAP_BOOSTER: { type: 'PIECE_SWAP_BOOSTER', name: 'Hold+', description: 'Enables Hold ability in restricted modes.', icon: '🔄', cost: 500, initialQuantity: 2 },
    LINE_CLEARER_BOOSTER: { type: 'LINE_CLEARER_BOOSTER', name: 'Laser', description: 'Clear a single line instantly.', icon: '⚡', cost: 1200, initialQuantity: 1 },
    FLIPPED_GRAVITY_BOOSTER: { type: 'FLIPPED_GRAVITY_BOOSTER', name: 'Anti-Grav', description: 'Flip gravity upside down.', icon: '🔃', cost: 2000, initialQuantity: 0 }
};

export const ABILITIES: Record<string, AbilityConfig> = {
    COLOR_SWAP: { id: 'COLOR_SWAP', name: 'Color Pulse', description: 'Paint 3x3 area with current piece color.', icon: 'Palette', cooldownMs: 30000, color: '#d946ef' },
    COLUMN_NUKE: { id: 'COLUMN_NUKE', name: 'Column Strike', description: 'Clear the column below.', icon: 'ArrowDown', cooldownMs: 45000, color: '#ef4444' },
    PIECE_SCULPT: { id: 'PIECE_SCULPT', name: 'Sculpt', description: 'Remove one block from current piece.', icon: 'Hammer', cooldownMs: 15000, color: '#fbbf24' }
};

export const ACHIEVEMENTS: Achievement[] = [
    { id: 'FIRST_DROP', title: 'First Drop', description: 'Clear your first line.', icon: 'Trophy', color: 'text-yellow-400' },
    { id: 'TETRIS', title: 'Tetris', description: 'Clear 4 lines at once.', icon: 'Layers', color: 'text-cyan-400' },
    { id: 'COMBO_5', title: 'Combo Breaker', description: 'Achieve a 5x Combo.', icon: 'Flame', color: 'text-orange-400' },
    { id: 'SCORE_100K', title: 'High Roller', description: 'Score 100,000 points.', icon: 'Star', color: 'text-purple-400' },
    { id: 'SCORE_500K', title: 'Tetris Master', description: 'Score 500,000 points.', icon: 'Crown', color: 'text-yellow-500' },
    { id: 'LEVEL_10', title: 'Speed Demon', description: 'Reach Level 10.', icon: 'Zap', color: 'text-blue-400' },
    { id: 'ZONE_CLEAR_8', title: 'Zone Octo', description: 'Clear 8 lines in one Zone.', icon: 'Eye', color: 'text-white' },
    { id: 'TSPIN_DOUBLE', title: 'T-Spinner', description: 'Perform a T-Spin Double.', icon: 'RotateCw', color: 'text-fuchsia-400' },
    { id: 'B2B_TETRIS', title: 'Back-to-Back', description: 'Perform consecutive Tetris clears.', icon: 'Repeat', color: 'text-green-400' },
    { id: 'BLITZ_SPEED', title: 'Light Speed', description: 'Reach max speed in Blitz.', icon: 'Zap', color: 'text-yellow-200' },
    { id: 'ALL_CLEAR', title: 'Perfect Clear', description: 'Clear the entire board.', icon: 'Sparkles', color: 'text-white' },
];

export const ADVENTURE_CAMPAIGN: AdventureWorld[] = [
    {
        id: 'world_1',
        name: 'NEON CITY',
        description: 'The journey begins.',
        themeColor: '#06b6d4',
        backgroundGradient: 'linear-gradient(to bottom, #0f172a, #082f49)',
        particleColor: '#22d3ee',
        levels: [
            {
                id: 'lvl_1_1',
                index: 0,
                worldId: 'world_1',
                title: 'Tutorial',
                description: 'Clear 5 lines to warm up.',
                objective: { type: 'LINES', target: 5 },
                style: { background: 'linear-gradient(to bottom, #0f172a, #082f49)', accentColor: '#06b6d4' },
                rewards: { coins: 100 },
                mapCoordinates: { x: 50, y: 10 },
                tutorialTip: { text: 'Use arrow keys to move and rotate. Space to hard drop.' }
            },
            {
                id: 'lvl_1_2',
                index: 1,
                worldId: 'world_1',
                title: 'Data Stream',
                description: 'Score 2,000 points.',
                objective: { type: 'SCORE', target: 2000 },
                style: { background: 'linear-gradient(to bottom, #0f172a, #082f49)', accentColor: '#06b6d4' },
                rewards: { coins: 150 },
                mapCoordinates: { x: 30, y: 25 }
            },
            // ... more levels would go here
            {
                id: 'lvl_1_boss',
                index: 5,
                worldId: 'world_1',
                title: 'The Gatekeeper',
                description: 'Defeat the AI Guardian.',
                objective: { type: 'BOSS', target: 3000 },
                boss: { name: 'Gatekeeper', ability: 'GARBAGE_RAIN', interval: 15000 },
                style: { background: 'linear-gradient(to bottom, #2a0a18, #000)', accentColor: '#ef4444' },
                rewards: { coins: 500, boosters: [{ type: 'BOMB_BOOSTER', amount: 1 }] },
                mapCoordinates: { x: 50, y: 90 }
            }
        ]
    }
];

export const LEVEL_PASS_COIN_REWARD = 100;
export const STAR_COIN_BONUS = 50;
export const MAX_STARS_PER_LEVEL = 3;
export const DEFAULT_COINS = 500;

export const FOCUS_GAUGE_MAX = 100;
export const FOCUS_GAUGE_PER_LINE = 10;
export const ZONE_DURATION_MS = 15000;

export const COMBO_MASTER_INITIAL_TIME = 30;
export const COMBO_MASTER_TIME_BONUS_BASE = 2;
export const COMBO_MASTER_TIME_BONUS_MULTIPLIER = 0.5;

export const ICE_PATTERN_SVG = "data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h20v20H0z' fill='none'/%3E%3Cpath d='M2 2l16 16M18 2L2 18' stroke='rgba(255,255,255,0.2)' stroke-width='1'/%3E%3C/svg%3E";

export const CHAOS_COLORS = ['#ef4444', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];

export const PUZZLE_LEVELS: PuzzleDefinition[] = [
    { layout: [
        "...........", // 11 width
        "...........",
        "...........",
        "...........",
        "XXXXX.XXXXX", // 11 width
        "XXXXX.XXXXX",
        "XXXXX.XXXXX",
        "XXXXX.XXXXX"
    ]} // Level 0 (I piece hole)
];

export const SLOW_TIME_BOOSTER_DURATION_MS = 30000;
export const FLIPPED_GRAVITY_BOOSTER_DURATION_MS = 15000;
