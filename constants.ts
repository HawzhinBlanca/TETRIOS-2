
import { TetrominoType, Tetromino, Booster, Achievement, Difficulty, GameMode, AdventureWorld, AbilityConfig, PuzzleDefinition, ColorblindMode } from './types';

export const STAGE_WIDTH = 10;
export const STAGE_HEIGHT = 23; // Keeping 23 for logic buffer, but rendering is handled by layout engine

// --- MUSICAL CONSTANTS ---
export const MUSICAL_SCALES = {
    // C Minor Pentatonic
    MINOR_PENTATONIC: [0, 3, 5, 7, 10, 12, 15, 17, 19, 22],
    // C Dorian (Cyberpunk feel)
    DORIAN: [0, 2, 3, 5, 7, 9, 10, 12, 14, 15],
    // C Phrygian (Dark/Tension)
    PHRYGIAN: [0, 1, 3, 5, 7, 8, 10, 12, 13, 15],
    // Major (Victory/Zone)
    MAJOR: [0, 2, 4, 5, 7, 9, 11, 12, 14, 16]
};

export const CHORD_PROGRESSIONS = [
    // Epic / Heroic (Cm - Ab - Fm - G)
    [ [0, 3, 7], [8, 12, 15], [5, 8, 12], [7, 11, 14] ],
    // Cyber / Dark (Cm - Eb - Bb - Fm)
    [ [0, 3, 7], [3, 7, 10], [-2, 2, 5], [5, 8, 12] ],
    // Uplifting (Ab - Bb - Cm - Cm)
    [ [8, 12, 15], [10, 14, 17], [12, 15, 19], [12, 15, 19] ]
];

export const COLORS: Record<string, string> = {
  I: 'rgb(6, 182, 212)', // Cyan
  J: 'rgb(59, 130, 246)', // Blue
  L: 'rgb(249, 115, 22)', // Orange
  O: 'rgb(234, 179, 8)',  // Yellow
  S: 'rgb(34, 197, 94)',  // Green
  T: 'rgb(168, 85, 247)', // Purple
  Z: 'rgb(239, 68, 68)',  // Red
  WILDCARD_SHAPE: 'rgb(255, 255, 255)',
  
  // Extended Shapes - Base Colors
  M1: '#f9a8d4', // Pink 300
  D2: '#f472b6', // Pink 400
  D2_H: '#ec4899', // Pink 500
  D2_V: '#db2777', // Pink 600
  T3: '#fb7185', // Rose 400
  T3_L: '#f43f5e', // Rose 500
  T3_I: '#e11d48', // Rose 600
  P5: '#818cf8', // Indigo 400 (I-Shape)
  P5_P: '#6366f1', // Indigo 500
  P5_X: '#4f46e5', // Indigo 600
  P5_F: '#4338ca', // Indigo 700
  U: '#14b8a6', // Teal 500
};

// Accessible Palettes (Okabe & Ito adapted)
export const PALETTES: Record<ColorblindMode, Record<string, string>> = {
    NORMAL: { ...COLORS },
    PROTANOPIA: {
        I: '#56B4E9', J: '#0072B2', L: '#E69F00', O: '#F0E442', S: '#009E73', T: '#CC79A7', Z: '#D55E00',
        WILDCARD_SHAPE: '#FFFFFF',
        M1: '#FFFFFF', D2: '#F0E442', D2_H: '#F0E442', D2_V: '#F0E442',
        T3: '#E69F00', T3_L: '#E69F00', T3_I: '#E69F00',
        P5: '#0072B2', P5_P: '#0072B2', P5_X: '#0072B2', P5_F: '#0072B2', U: '#009E73',
    },
    DEUTERANOPIA: {
        I: '#56B4E9', J: '#0072B2', L: '#E69F00', O: '#F0E442', S: '#009E73', T: '#CC79A7', Z: '#D55E00',
        WILDCARD_SHAPE: '#FFFFFF',
        M1: '#FFFFFF', D2: '#F0E442', D2_H: '#F0E442', D2_V: '#F0E442',
        T3: '#E69F00', T3_L: '#E69F00', T3_I: '#E69F00',
        P5: '#0072B2', P5_P: '#0072B2', P5_X: '#0072B2', P5_F: '#0072B2', U: '#009E73',
    },
    TRITANOPIA: {
        I: '#66CCEE', J: '#228833', L: '#EE6677', O: '#CCBB44', S: '#4477AA', T: '#AA3377', Z: '#AA6677',
        WILDCARD_SHAPE: '#FFFFFF',
        M1: '#FFFFFF', D2: '#CCBB44', D2_H: '#CCBB44', D2_V: '#CCBB44',
        T3: '#EE6677', T3_L: '#EE6677', T3_I: '#EE6677',
        P5: '#228833', P5_P: '#228833', P5_X: '#228833', P5_F: '#228833', U: '#4477AA',
    }
};

export const CHAOS_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];

export const MODIFIER_COLORS = {
    GEM: 'rgb(236, 72, 153)', 
    BOMB: 'rgb(239, 68, 68)', 
    BOMB_TEXT: '#ffffff',
    ICE: 'rgb(96, 165, 250)', 
    CRACKED_ICE: 'rgb(191, 219, 254)', 
    WILDCARD_BLOCK: 'rgb(234, 179, 8)', 
    LASER_BLOCK: 'rgb(6, 182, 212)', 
    NUKE_BLOCK: 'rgb(255, 0, 128)', 
    BEDROCK: 'rgb(100, 116, 139)',
    SLOW_BLOCK: 'rgb(99, 102, 241)', 
    MULTIPLIER_BLOCK: 'rgb(234, 179, 8)',
    FREEZE_BLOCK: 'rgb(165, 243, 252)',
    DRILL_BLOCK: 'rgb(249, 115, 22)',
    CHAIN_BLOCK: '#facc15',
    FUSE_BLOCK: '#f97316',
};

export const EMOJI_MAP: Record<string, string> = {
    'I': '🧊', 'J': '🧢', 'L': '🍊', 'O': '🧀', 
    'S': '🐍', 'T': '🍇', 'Z': '🍎', 'G': '🗑️',
    'M1': '🍬', 'D2': '🧠', 'T3': '🔥', 'P5': '⭐',
    'U': '🧲',
};

export const TETROMINOS: Record<string, Tetromino> = {
  0: { shape: [[0]], color: '0, 0, 0', type: 'I' },
  I: { shape: [[0, 0, 0, 0], ['I', 'I', 'I', 'I'], [0, 0, 0, 0], [0, 0, 0, 0]], color: COLORS.I, type: 'I' },
  J: { shape: [['J', 0, 0], ['J', 'J', 'J'], [0, 0, 0]], color: COLORS.J, type: 'J' },
  L: { shape: [[0, 0, 'L'], ['L', 'L', 'L'], [0, 0, 0]], color: COLORS.L, type: 'L' },
  O: { shape: [['O', 'O'], ['O', 'O']], color: COLORS.O, type: 'O' },
  S: { shape: [[0, 'S', 'S'], ['S', 'S', 0], [0, 0, 0]], color: COLORS.S, type: 'S' },
  T: { shape: [[0, 'T', 0], ['T', 'T', 'T'], [0, 0, 0]], color: COLORS.T, type: 'T' },
  Z: { shape: [['Z', 'Z', 0], [0, 'Z', 'Z'], [0, 0, 0]], color: COLORS.Z, type: 'Z' },
  WILDCARD_SHAPE: { shape: [[0]], color: COLORS.WILDCARD_SHAPE, type: 'WILDCARD_SHAPE' },
  M1: { shape: [['M1']], color: COLORS.M1, type: 'M1' },
  D2: { shape: [['D2', 'D2']], color: COLORS.D2, type: 'D2' },
  D2_H: { shape: [['D2_H', 'D2_H']], color: COLORS.D2_H, type: 'D2_H' },
  D2_V: { shape: [['D2_V'], ['D2_V']], color: COLORS.D2_V, type: 'D2_V' },
  T3: { shape: [['T3', 'T3', 'T3']], color: COLORS.T3, type: 'T3' },
  T3_I: { shape: [['T3_I'], ['T3_I'], ['T3_I']], color: COLORS.T3_I, type: 'T3_I' },
  T3_L: { shape: [['T3_L', 0], ['T3_L', 'T3_L']], color: COLORS.T3_L, type: 'T3_L' },
  P5: { shape: [['P5', 'P5', 'P5', 'P5', 'P5']], color: COLORS.P5, type: 'P5' },
  P5_P: { shape: [['P5_P', 'P5_P'], ['P5_P', 'P5_P'], ['P5_P', 0]], color: COLORS.P5_P, type: 'P5_P' },
  P5_X: { shape: [[0, 'P5_X', 0], ['P5_X', 'P5_X', 'P5_X'], [0, 'P5_X', 0]], color: COLORS.P5_X, type: 'P5_X' },
  P5_F: { shape: [[0, 'P5_F', 'P5_F'], ['P5_F', 'P5_F', 0], [0, 'P5_F', 0]], color: COLORS.P5_F, type: 'P5_F' },
  U: { shape: [['U', 0, 'U'], ['U', 'U', 'U']], color: COLORS.U, type: 'U' },
};

type KickTable = Record<string, [number, number][][]>;

export const KICKS: KickTable = {
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
    SINGLE: 100, DOUBLE: 300, TRIPLE: 500, TETRIS: 800,
    TSPIN: 400, TSPIN_SINGLE: 800, TSPIN_DOUBLE: 1200, TSPIN_TRIPLE: 1600,
    PERFECT_CLEAR: 3500, BACK_TO_BACK_MULTIPLIER: 1.5, COMBO_FACTOR: 50,
    SOFT_DROP: 1, HARD_DROP: 2,
    GEM_COLLECT_BONUS: 500, BOMB_DEFUZE_BONUS: 1000,
    BOOSTER_LINE_CLEARER_BONUS: 500, BOOSTER_BOMB_CLEAR_BONUS: 500,
    POWERUP_NUKE_BLOCK_BONUS: 2000, MONO_COLOR_BONUS: 200, PATTERN_BONUS: 300,
    FRENZY_MULTIPLIER: 2, ZONE_CLEAR_BONUS: 1000,
    PERFECT_DROP: 50, TRICK_CLUTCH: 1000, TRICK_SNIPER: 800, TRICK_ALL_SPIN: 400,
    DANGER_BONUS_MULTIPLIER: 1.5, CHAIN_REACTION_BONUS: 500, FUSE_DETONATE_BONUS: 250, 
};

export const B2B_INCREMENT = 0.5; 
export const LEVEL_PASS_COIN_REWARD = 150;
export const STAR_COIN_BONUS = 50;
export const DEFAULT_COINS = 0;
export const FOCUS_GAUGE_MAX = 100;
export const FOCUS_GAUGE_PER_LINE = 10;
export const ZONE_DURATION_MS = 10000;
export const MOMENTUM_MAX = 100;
export const MOMENTUM_DECAY_PER_SEC = 2.5;
export const OVERDRIVE_DURATION_MS = 12000;
export const OVERDRIVE_SCORE_MULTIPLIER = 2;

export const MOMENTUM_GAINS = {
    PERFECT_DROP: 15, B2B: 10, COMBO: 5, TSPIN: 20, TETRIS: 20, LINE: 5
};

export const HOLD_DECAY_MS = 15000;
export const HOLD_CHARGE_MAX = 3;
export const HOLD_CHARGE_MULTIPLIER = 1.5;
export const COMBO_MASTER_INITIAL_TIME = 60;
export const COMBO_MASTER_TIME_BONUS_BASE = 2.0;
export const COMBO_MASTER_TIME_BONUS_MULTIPLIER = 0.5;
export const SLOW_TIME_BOOSTER_DURATION_MS = 10000;
export const FLIPPED_GRAVITY_BOOSTER_DURATION_MS = 15000;
export const EXTENDED_SHAPES: TetrominoType[] = ['M1', 'D2', 'T3', 'P5', 'D2_H', 'D2_V', 'T3_L', 'T3_I', 'P5_P', 'P5_X', 'P5_F', 'U'];
export const BLITZ_INITIAL_DROPTIME = 1000;
export const SURVIVAL_INITIAL_GARBAGE_INTERVAL = 10000;
export const SURVIVAL_MIN_GARBAGE_INTERVAL = 2000;
export const SURVIVAL_GARBAGE_DECREMENT = 500;
export const FRENZY_DURATION_MS = 10000;
export const FRENZY_COMBO_THRESHOLD = 4;
export const FLASH_DURATION_MS = 300;
export const SHAKE_DURATION_HARD_MS = 400;
export const SHAKE_DURATION_SOFT_MS = 200;
export const PARTICLE_AMOUNT_MEDIUM = 5;
export const PARTICLE_AMOUNT_SOFT = 3;
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
    rotateCW: ['ArrowUp', 'e', 'x'],
    rotateCCW: ['z', 'Control'],
    hold: ['c', 'Shift'],
    zone: ['v'],
    rewind: ['Backspace', 'r'],
    ability1: ['1'],
    ability2: ['2'],
    ability3: ['3']
};

export const GAME_MODES_CONFIG = [
    { id: 'MARATHON', label: 'Marathon', description: 'Endless classic mode. Survive as speed increases.', icon: 'Trophy', color: 'text-cyan-400' },
    { id: 'SPRINT', label: 'Sprint', description: 'Clear 40 lines as fast as possible.', icon: 'Zap', color: 'text-yellow-400' },
    { id: 'BLITZ', label: 'Blitz', description: '2 Minute score attack. Speed increases with score.', icon: 'Clock', color: 'text-orange-400' },
    { id: 'SURVIVAL', label: 'Survival', description: 'Garbage appears automatically. Survive the chaos.', icon: 'Skull', color: 'text-red-400' },
    { id: 'COMBO_MASTER', label: 'Combo Master', description: 'Maintain combos to extend time.', icon: 'Flame', color: 'text-purple-400' },
    { id: 'ADVENTURE', label: 'Adventure', description: 'Journey through worlds with unique challenges.', icon: 'Map', color: 'text-green-400' },
    { id: 'ZEN', label: 'Zen', description: 'No gravity, no stress. Just clear lines.', icon: 'Sparkles', color: 'text-pink-400' },
    { id: 'PUZZLE', label: 'Puzzle', description: 'Solve specific board layouts.', icon: 'Brain', color: 'text-blue-400' },
    { id: 'DAILY', label: 'Daily', description: 'One chance per day. Compete globally.', icon: 'Calendar', color: 'text-gold-400' },
];

export const DIFFICULTY_SETTINGS: Record<string, any> = {
    EASY: { label: 'Easy', scoreMult: 0.5, gravityMult: 0.8, lockDelay: 1000, color: 'text-green-400' },
    MEDIUM: { label: 'Normal', scoreMult: 1.0, gravityMult: 1.0, lockDelay: 500, color: 'text-yellow-400' },
    HARD: { label: 'Hard', scoreMult: 1.5, gravityMult: 1.5, lockDelay: 300, color: 'text-red-400' },
};

export const BOOSTERS: Record<string, Booster> = {
    BOMB_BOOSTER: { type: 'BOMB_BOOSTER', name: 'Bomb', description: 'Clears target rows.', icon: 'Bomb', cost: 100, initialQuantity: 3 },
    SLOW_TIME_BOOSTER: { type: 'SLOW_TIME_BOOSTER', name: 'Slow Time', description: 'Slows gravity for 10s.', icon: 'Clock', cost: 150, initialQuantity: 2 },
    PIECE_SWAP_BOOSTER: { type: 'PIECE_SWAP_BOOSTER', name: 'Hold+', description: 'Allows unlimited holds.', icon: 'RotateCcw', cost: 200, initialQuantity: 1 },
    LINE_CLEARER_BOOSTER: { type: 'LINE_CLEARER_BOOSTER', name: 'Laser', description: 'Clears one specific line.', icon: 'Sparkles', cost: 120, initialQuantity: 2 },
    FLIPPED_GRAVITY_BOOSTER: { type: 'FLIPPED_GRAVITY_BOOSTER', name: 'Anti-Grav', description: 'Inverts gravity for 15s.', icon: 'ArrowDownUp', cost: 250, initialQuantity: 1 },
};

export const ABILITIES: Record<string, AbilityConfig> = {
    COLOR_SWAP: { id: 'COLOR_SWAP', name: 'Color Pulse', description: 'Changes nearby blocks to same color.', icon: 'Palette', cooldownMs: 30000, color: '#a78bfa' },
    COLUMN_NUKE: { id: 'COLUMN_NUKE', name: 'Col Blast', description: 'Clears a vertical column.', icon: 'ArrowDown', cooldownMs: 45000, color: '#ef4444' },
    PIECE_SCULPT: { id: 'PIECE_SCULPT', name: 'Sculpt', description: 'Removes blocks from current piece.', icon: 'Hammer', cooldownMs: 20000, color: '#fbbf24' },
    YEET: { id: 'YEET', name: 'Yeet', description: 'Discard current piece.', icon: 'Trash2', cooldownMs: 5000, color: '#f87171' }
};

export const ACHIEVEMENTS: Achievement[] = [
    { id: 'FIRST_DROP', title: 'First Drop', description: 'Clear your first line.', icon: 'Award', color: 'text-blue-400' },
    { id: 'TETRIS', title: 'Tetris!', description: 'Clear 4 lines at once.', icon: 'Layers', color: 'text-cyan-400' },
    { id: 'COMBO_5', title: 'Combo Breaker', description: 'Achieve a 5x Combo.', icon: 'Flame', color: 'text-orange-400' },
    { id: 'SCORE_100K', title: 'High Roller', description: 'Score 100,000 points.', icon: 'Trophy', color: 'text-yellow-400' },
    { id: 'SCORE_500K', title: 'Half Millionaire', description: 'Score 500,000 points.', icon: 'Crown', color: 'text-purple-400' },
    { id: 'LEVEL_10', title: 'Speed Demon', description: 'Reach Level 10.', icon: 'Zap', color: 'text-red-400' },
    { id: 'ZONE_CLEAR_8', title: 'In The Zone', description: 'Clear 8 lines in Zone Mode.', icon: 'Eye', color: 'text-white' },
    { id: 'TSPIN_DOUBLE', title: 'T-Spinner', description: 'Perform a T-Spin Double.', icon: 'RotateCw', color: 'text-pink-400' },
    { id: 'B2B_TETRIS', title: 'Back 2 Back', description: 'Perform consecutive Tetrises.', icon: 'Repeat', color: 'text-green-400' },
    { id: 'BLITZ_SPEED', title: 'Ludicrous Speed', description: 'Reach max speed in Blitz.', icon: 'Activity', color: 'text-red-500' },
    { id: 'ALL_CLEAR', title: 'Perfectionist', description: 'Clear the entire board.', icon: 'Sparkles', color: 'text-gold-400' },
];

export const ADVENTURE_CAMPAIGN: AdventureWorld[] = [
    {
        id: 'world_1',
        name: 'Neon City',
        description: 'The beginning of the journey.',
        themeColor: '#06b6d4',
        backgroundGradient: 'linear-gradient(to bottom, #0f172a, #083344)',
        particleColor: '#22d3ee',
        levels: [
            { id: 'lvl_1_1', index: 0, worldId: 'world_1', title: 'Training Day', description: 'Clear 10 lines.', objective: { type: 'LINES', target: 10 }, style: { background: '#000', accentColor: '#06b6d4' }, mapCoordinates: { x: 20, y: 10 } },
            { id: 'lvl_1_2', index: 1, worldId: 'world_1', title: 'Score Attack', description: 'Reach 5000 points.', objective: { type: 'SCORE', target: 5000 }, style: { background: '#000', accentColor: '#06b6d4' }, mapCoordinates: { x: 50, y: 30 } },
            { id: 'lvl_1_3', index: 2, worldId: 'world_1', title: 'The Boss', description: 'Defeat the Gatekeeper.', objective: { type: 'BOSS', target: 2000 }, boss: { name: 'Gatekeeper', ability: 'GARBAGE_RAIN', interval: 10000 }, style: { background: '#000', accentColor: '#ef4444' }, mapCoordinates: { x: 80, y: 50 } }
        ]
    }
];

export const PUZZLE_LEVELS: PuzzleDefinition[] = [{ layout: ['XXXX......', 'XXXX......'] }, { layout: ['X........X', 'XX......XX', 'XXX....XXX', 'XXXX..XXXX'] }];
export const MAX_STARS_PER_LEVEL = 3;
export const ICE_PATTERN_SVG = "data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L19 19M19 1L1 19' stroke='rgba(255,255,255,0.2)' stroke-width='1'/%3E%3C/svg%3E";
