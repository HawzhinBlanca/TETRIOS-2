
import { Tetromino, TetrominoType, AdventureWorld, LevelObjectiveType, InitialBoardModifierType, GameGimmickType, Booster, BoosterType, Difficulty, ColorblindMode, Achievement, KeyMap, AbilityConfig, AbilityType } from './types';
import { Palette, ArrowDown, Hammer } from 'lucide-react';

export const STAGE_WIDTH = 10;
export const STAGE_HEIGHT = 20;

export const DEFAULT_DAS = 130; 
export const DEFAULT_ARR = 10;
export const DEFAULT_GAMESPEED = 1;

export const DEFAULT_CONTROLS: KeyMap = {
    moveLeft: ['ArrowLeft', 'a', 'GP_AXIS_0-', 'GP_BTN_14'], 
    moveRight: ['ArrowRight', 'd', 'GP_AXIS_0+', 'GP_BTN_15'], 
    softDrop: ['ArrowDown', 's', 'GP_AXIS_1+', 'GP_BTN_13'], 
    hardDrop: [' ', 'GP_BTN_0'], 
    rotateCW: ['ArrowUp', 'x', 'w', 'GP_BTN_1', 'GP_BTN_12'], 
    rotateCCW: ['z', 'Control', 'GP_BTN_2'], 
    hold: ['c', 'Shift', 'GP_BTN_4', 'GP_BTN_5'], 
    zone: ['v', 'Enter', 'GP_BTN_3'], 
    rewind: ['Backspace', 'GP_BTN_6', 'GP_BTN_7'], 
    ability1: ['1', 'q', 'GP_BTN_8'],
    ability2: ['2', 'e', 'GP_BTN_9'],
    ability3: ['3', 'r', 'GP_BTN_10'],
};

export const ABILITIES: Record<AbilityType, AbilityConfig> = {
    COLOR_SWAP: { id: 'COLOR_SWAP', name: 'Color Pulse', description: 'Paint 3x3 area with the active color.', icon: 'Palette', cooldownMs: 25000, color: '#a78bfa' }, 
    COLUMN_NUKE: { id: 'COLUMN_NUKE', name: 'Col Nuke', description: 'Obliterate the column below your piece.', icon: 'ArrowDown', cooldownMs: 45000, color: '#ef4444' },
    PIECE_SCULPT: { id: 'PIECE_SCULPT', name: 'Sculptor', description: 'Remove a block from the active piece.', icon: 'Hammer', cooldownMs: 15000, color: '#fbbf24' },
};

export const DIFFICULTY_SETTINGS: Record<Difficulty, { das: number; arr: number; speed: number; label: string; color: string }> = {
    EASY: { das: 170, arr: 30, speed: 0.8, label: 'Easy', color: 'text-green-400' },
    MEDIUM: { das: 130, arr: 10, speed: 1.0, label: 'Medium', color: 'text-cyan-400' },
    HARD: { das: 100, arr: 0, speed: 1.3, label: 'Hard', color: 'text-fuchsia-400' }
};

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
  GEM_COLLECT_BONUS: 250,
  BOMB_DEFUZE_BONUS: 500, 
  FRENZY_MULTIPLIER: 2, 
  POWERUP_NUKE_BONUS: 1500, 
  POWERUP_LASER_BONUS: 700, 
  BOOSTER_BOMB_CLEAR_BONUS: 1000, 
  BOOSTER_LINE_CLEARER_BONUS: 750, 
  POWERUP_NUKE_BLOCK_BONUS: 2500, 
  ZONE_CLEAR_BONUS: 200,
  MONO_COLOR_BONUS: 1000, 
  PATTERN_BONUS: 500,
};

export const ZONE_DURATION_MS = 15000;
export const FOCUS_GAUGE_MAX = 100;
export const FOCUS_GAUGE_PER_LINE = 5; 

export const COLORS: Record<TetrominoType, string> = {
  I: 'rgb(6, 182, 212)', 
  J: 'rgb(59, 130, 246)', 
  L: 'rgb(249, 115, 22)', 
  O: 'rgb(234, 179, 8)', 
  S: 'rgb(34, 197, 94)', 
  T: 'rgb(168, 85, 247)', 
  Z: 'rgb(239, 68, 68)', 
  G: 'rgb(100, 116, 139)', 
  WILDCARD_SHAPE: 'rgb(255, 255, 255)',
  // Extended Shapes Colors
  M1: 'rgb(255, 255, 255)', // Monomino (White/Holy)
  D2: 'rgb(20, 184, 166)',  // Domino (Teal)
  T3: 'rgb(244, 63, 94)',   // Triomino (Rose)
  P5: 'rgb(234, 179, 8)',   // Pentomino (Gold)
  
  // Variants
  D2_H: 'rgb(20, 184, 166)',
  D2_V: 'rgb(20, 184, 166)',
  T3_L: 'rgb(244, 63, 94)',
  T3_I: 'rgb(244, 63, 94)',
  P5_P: 'rgb(234, 179, 8)',
  P5_X: 'rgb(234, 179, 8)',
  P5_F: 'rgb(234, 179, 8)',
};

export const EXTENDED_SHAPES: TetrominoType[] = ['M1', 'D2', 'T3', 'P5', 'D2_H', 'D2_V', 'T3_L', 'T3_I', 'P5_P', 'P5_X', 'P5_F'];

export const CHAOS_COLORS = [
    'rgb(239, 68, 68)', // Red
    'rgb(34, 197, 94)', // Green
    'rgb(59, 130, 246)', // Blue
    'rgb(234, 179, 8)', // Yellow
    'rgb(168, 85, 247)', // Purple
    'rgb(236, 72, 153)', // Pink
];

export const COLOR_PALETTES: Record<ColorblindMode, Record<TetrominoType, string>> = {
    NORMAL: COLORS,
    PROTANOPIA: { 
        I: 'rgb(6, 182, 212)', J: 'rgb(0, 90, 200)', L: 'rgb(255, 190, 0)', O: 'rgb(255, 230, 0)', 
        S: 'rgb(200, 200, 50)', T: 'rgb(130, 50, 180)', Z: 'rgb(100, 100, 100)', G: 'rgb(200, 200, 200)',
        WILDCARD_SHAPE: 'rgb(255, 255, 255)',
        M1: 'rgb(255, 255, 255)', D2: 'rgb(150,150,150)', T3: 'rgb(200,150,150)', P5: 'rgb(200,100,150)',
        D2_H: 'rgb(150,150,150)', D2_V: 'rgb(150,150,150)',
        T3_L: 'rgb(200,150,150)', T3_I: 'rgb(200,150,150)',
        P5_P: 'rgb(200,100,150)', P5_X: 'rgb(200,100,150)', P5_F: 'rgb(200,100,150)'
    },
    DEUTERANOPIA: { 
        I: 'rgb(100, 200, 255)', J: 'rgb(0, 0, 180)', L: 'rgb(255, 165, 0)', O: 'rgb(255, 255, 0)',
        S: 'rgb(180, 180, 0)', T: 'rgb(100, 50, 150)', Z: 'rgb(128, 128, 128)', G: 'rgb(220, 220, 220)',
        WILDCARD_SHAPE: 'rgb(255, 255, 255)',
        M1: 'rgb(255, 255, 255)', D2: 'rgb(150,150,150)', T3: 'rgb(200,150,150)', P5: 'rgb(200,100,150)',
        D2_H: 'rgb(150,150,150)', D2_V: 'rgb(150,150,150)',
        T3_L: 'rgb(200,150,150)', T3_I: 'rgb(200,150,150)',
        P5_P: 'rgb(200,100,150)', P5_X: 'rgb(200,100,150)', P5_F: 'rgb(200,100,150)'
    },
    TRITANOPIA: { 
        I: 'rgb(0, 200, 200)', J: 'rgb(0, 100, 100)', L: 'rgb(255, 100, 100)', O: 'rgb(255, 200, 200)',
        S: 'rgb(0, 200, 0)', T: 'rgb(150, 0, 0)', Z: 'rgb(255, 0, 0)', G: 'rgb(150, 150, 150)',
        WILDCARD_SHAPE: 'rgb(255, 255, 255)',
        M1: 'rgb(255, 255, 255)', D2: 'rgb(150,150,150)', T3: 'rgb(200,150,150)', P5: 'rgb(200,100,150)',
        D2_H: 'rgb(150,150,150)', D2_V: 'rgb(150,150,150)',
        T3_L: 'rgb(200,150,150)', T3_I: 'rgb(200,150,150)',
        P5_P: 'rgb(200,100,150)', P5_X: 'rgb(200,100,150)', P5_F: 'rgb(200,100,150)'
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
};

export const TETROMINOS: Record<TetrominoType | 0, Tetromino> = {
  0: { shape: [[0]], color: 'rgb(0, 0, 0)', type: 'I' },
  I: { type: 'I', shape: [[0, 'I', 0, 0], [0, 'I', 0, 0], [0, 'I', 0, 0], [0, 'I', 0, 0]], color: COLORS.I },
  J: { type: 'J', shape: [[0, 'J', 0], [0, 'J', 0], ['J', 'J', 0]], color: COLORS.J },
  L: { type: 'L', shape: [[0, 'L', 0], [0, 'L', 0], [0, 'L', 'L']], color: COLORS.L },
  O: { type: 'O', shape: [['O', 'O'], ['O', 'O']], color: COLORS.O },
  S: { type: 'S', shape: [[0, 'S', 'S'], ['S', 'S', 0], [0, 0, 0]], color: COLORS.S },
  T: { type: 'T', shape: [[0, 0, 0], ['T', 'T', 'T'], [0, 'T', 0]], color: COLORS.T },
  Z: { type: 'Z', shape: [['Z', 'Z', 0], [0, 'Z', 'Z'], [0, 0, 0]], color: COLORS.Z },
  G: { type: 'G', shape: [['G']], color: COLORS.G },
  WILDCARD_SHAPE: { type: 'WILDCARD_SHAPE', shape: [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], color: COLORS.WILDCARD_SHAPE },
  
  // Extended Shapes
  M1: { type: 'M1', shape: [['M1']], color: COLORS.M1 },
  D2: { type: 'D2', shape: [['D2', 'D2']], color: COLORS.D2 },
  T3: { type: 'T3', shape: [['T3', 'T3'], ['T3', 0]], color: COLORS.T3 },
  P5: { type: 'P5', shape: [[0, 'P5', 0], ['P5', 'P5', 'P5'], [0, 'P5', 0]], color: COLORS.P5 }, // Cross Shape
  
  // Variants
  D2_H: { type: 'D2_H', shape: [['D2_H', 'D2_H']], color: COLORS.D2_H },
  D2_V: { type: 'D2_V', shape: [['D2_V'], ['D2_V']], color: COLORS.D2_V },
  T3_L: { type: 'T3_L', shape: [['T3_L', 0], ['T3_L', 'T3_L']], color: COLORS.T3_L },
  T3_I: { type: 'T3_I', shape: [['T3_I', 'T3_I', 'T3_I']], color: COLORS.T3_I },
  P5_P: { type: 'P5_P', shape: [['P5_P', 'P5_P'], ['P5_P', 'P5_P'], ['P5_P', 0]], color: COLORS.P5_P },
  P5_X: { type: 'P5_X', shape: [[0, 'P5_X', 0], ['P5_X', 'P5_X', 'P5_X'], [0, 'P5_X', 0]], color: COLORS.P5_X },
  P5_F: { type: 'P5_F', shape: [[0, 'P5_F', 'P5_F'], ['P5_F', 'P5_F', 0], [0, 'P5_F', 0]], color: COLORS.P5_F },
};

// Kicks need to be updated if we were doing full rotation for new shapes, but we'll default to JLSTZ for most
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
    layout: string[]; 
}

export const PUZZLE_LEVELS: PuzzleDefinition[] = [
    { name: "The Well", description: "Clear 4 lines with the I-piece to win.", bag: ['I', 'I', 'I', 'I', 'I'], layout: ["X.XXXXXXXX", "X.XXXXXXXX", "X.XXXXXXXX", "X.XXXXXXXX"] },
    { name: "T-Spin Tutor", description: "Perform a T-Spin Double to clear.", bag: ['T', 'T', 'T'], layout: ["XX.XXXXXXX", "XX...XXXXX", "XX.XXXXXXX"] },
    { name: "Combo Starter", description: "Clear the board using the provided sequence.", bag: ['L', 'J', 'Z', 'S', 'O'], layout: ["XX.XXXXXXX", "XX.XXXXXXX", "XXXX.XXXXX", "XXXX.XXXXX"] }
];

export const SHAKE_DURATION_SOFT_MS = 200;
export const SHAKE_DURATION_HARD_MS = 400;
export const FLASH_DURATION_MS = 150;
export const PARTICLE_AMOUNT_SOFT = 8;
export const PARTICLE_AMOUNT_MEDIUM = 20;
export const PARTICLE_AMOUNT_HARD = 40;

export const FRENZY_DURATION_MS = 8000; 
export const FRENZY_COMBO_THRESHOLD = 2; 

export const SLOW_TIME_BOOSTER_DURATION_MS = 30000;
export const FLIPPED_GRAVITY_BOOSTER_DURATION_MS = 15000;

export const BLITZ_DURATION_MS = 120 * 1000;
export const BLITZ_INITIAL_DROPTIME = 300;
export const BLITZ_SPEED_THRESHOLDS = [
    { score: 5000, speedFactor: 0.85, message: "SPEED UP x1.5!" },
    { score: 15000, speedFactor: 0.8, message: "SPEED UP x2!" },
    { score: 30000, speedFactor: 0.75, message: "CRITICAL SPEED!" },
    { score: 50000, speedFactor: 0.7, message: "INSANE!" },
];
export const BLITZ_POWERUP_SPAWN_CHANCE_MULTIPLIER = 2;

export const SURVIVAL_INITIAL_GARBAGE_INTERVAL = 10000;
export const SURVIVAL_MIN_GARBAGE_INTERVAL = 1000;
export const SURVIVAL_GARBAGE_DECREMENT = 500;

export const COMBO_MASTER_INITIAL_TIME = 30;
export const COMBO_MASTER_TIME_BONUS_BASE = 2;
export const COMBO_MASTER_TIME_BONUS_MULTIPLIER = 1.5;

export const DEFAULT_COINS = 500;
export const LEVEL_PASS_COIN_REWARD = 100;
export const STAR_COIN_BONUS = 50;
export const MAX_STARS_PER_LEVEL = 3;

export const BOOSTERS: Record<BoosterType, Booster> = {
    BOMB_BOOSTER: { type: 'BOMB_BOOSTER', name: 'Bomb Booster', description: 'Activate to clear a chosen 2-3 row section of the matrix.', icon: '💣', initialQuantity: 1, cost: 150 },
    SLOW_TIME_BOOSTER: { type: 'SLOW_TIME_BOOSTER', name: 'Slow Time', description: 'Temporarily reduce falling speed for 30s.', icon: '⏳', initialQuantity: 0, cost: 200 },
    PIECE_SWAP_BOOSTER: { type: 'PIECE_SWAP_BOOSTER', name: 'Piece Swap+', description: 'Enable Hold ability for this level.', icon: '🔄', initialQuantity: 0, cost: 250 },
    LINE_CLEARER_BOOSTER: { type: 'LINE_CLEARER_BOOSTER', name: 'Line Clearer', description: 'Instantly clear one specific line.', icon: '🧹', initialQuantity: 0, cost: 300 },
    FLIPPED_GRAVITY_BOOSTER: { type: 'FLIPPED_GRAVITY_BOOSTER', name: 'Flipped Gravity', description: 'Invert gravity for 15s. Blocks fall up!', icon: '🙃', initialQuantity: 0, cost: 400 },
};

export const ACHIEVEMENTS: Achievement[] = [
    { id: 'FIRST_DROP', title: 'First Contact', description: 'Clear your first line.', icon: 'Zap', color: 'text-white' },
    { id: 'TETRIS', title: 'Tetris God', description: 'Clear 4 lines at once.', icon: 'Layers', color: 'text-cyan-400' },
    { id: 'COMBO_5', title: 'Combo Breaker', description: 'Reach a Combo of 5.', icon: 'Flame', color: 'text-orange-400' },
    { id: 'FRENZY', title: 'Frenzy!', description: 'Trigger Frenzy Mode.', icon: 'Sparkles', color: 'text-yellow-400' },
    { id: 'SCORE_100K', title: 'High Roller', description: 'Score 100,000 points in one game.', icon: 'Trophy', color: 'text-purple-400' },
    { id: 'LEVEL_10', title: 'Survivor', description: 'Reach Level 10.', icon: 'Shield', color: 'text-emerald-400' },
    { id: 'ZONE_CLEAR_8', title: 'Zone Master', description: 'Clear 8 lines in one Zone activation.', icon: 'Eye', color: 'text-indigo-400' },
    { id: 'TSPIN_DOUBLE', title: 'Tactician', description: 'Perform a T-Spin Double.', icon: 'RotateCw', color: 'text-fuchsia-400' },
    { id: 'B2B_TETRIS', title: 'Back-to-Back', description: 'Perform a Back-to-Back Tetris.', icon: 'Repeat', color: 'text-pink-400' },
    { id: 'SCORE_500K', title: 'Grandmaster', description: 'Score 500,000 points in one game.', icon: 'Crown', color: 'text-red-500' },
    { id: 'BLITZ_SPEED', title: 'Speed Demon', description: 'Trigger max speed in Blitz mode.', icon: 'Zap', color: 'text-yellow-300' },
    { id: 'ALL_CLEAR', title: 'Clean Slate', description: 'Completely clear the board.', icon: 'Eraser', color: 'text-white' }
];

// --- SAGA MAP DATA ---
export const ADVENTURE_CAMPAIGN: AdventureWorld[] = [
    {
        id: 'world_1',
        name: 'Neon District',
        description: 'The Grid is destabilizing. Reboot the core systems.',
        themeColor: '#06b6d4',
        backgroundGradient: 'linear-gradient(to top, #0f172a, #082f49)',
        particleColor: '#22d3ee',
        levels: [
            {
                id: 'lvl_1_1', index: 0, worldId: 'world_1',
                title: 'System Boot', description: 'Clear 10 lines to initialize.',
                mapCoordinates: { x: 50, y: 10 }, 
                objective: { type: 'LINES', target: 10 },
                constraints: { movesLimit: 40 },
                style: { background: 'linear-gradient(to top, #0f172a, #082f49)', accentColor: '#22d3ee' },
                storyStart: [{ id: 's1', speaker: 'AI Guide', text: 'Operator, the mainframe is offline. We need to clear the corrupted blocks to reboot the system. Start with 10 lines.', side: 'left', avatar: '🤖' }],
                rewards: { coins: 100 }
            },
            {
                id: 'lvl_1_2', index: 1, worldId: 'world_1',
                title: 'Color Chaos', description: 'Match colors to clear.',
                mapCoordinates: { x: 30, y: 25 },
                objective: { type: 'SCORE', target: 5000 },
                rules: ['COLOR_CHAOS'],
                constraints: { timeLimit: 120 },
                style: { background: 'linear-gradient(to top, #1e1b4b, #312e81)', accentColor: '#818cf8' },
                storyStart: [{ id: 's2', speaker: 'AI Guide', text: 'Logic error! Block colors are randomized. Match single colors in a row for massive bonuses.', side: 'left', avatar: '🤖' }],
                rewards: { coins: 150 }
            },
            {
                id: 'lvl_1_3', index: 2, worldId: 'world_1',
                title: 'Gravity Well', description: 'Survive 60s of unstable physics.',
                mapCoordinates: { x: 70, y: 40 },
                objective: { type: 'TIME_SURVIVAL', target: 60 },
                constraints: { timeLimit: 60 },
                style: { background: 'linear-gradient(to top, #1e293b, #334155)', accentColor: '#fbbf24' },
                storyStart: [{ id: 's3', speaker: 'AI Guide', text: 'Warning: Gravity anomaly detected. The physics engine is unstable. Hold your ground for 60 seconds.', side: 'left', avatar: '🤖' }],
                rewards: { coins: 150 }
            },
            {
                id: 'lvl_1_BOSS', index: 3, worldId: 'world_1',
                title: 'GRID OVERLORD', description: 'Defeat the corrupted sector guardian.',
                mapCoordinates: { x: 50, y: 60 },
                objective: { type: 'BOSS', target: 3000 }, 
                boss: { name: 'Grid Overlord', ability: 'GARBAGE_RAIN', interval: 8000, maxHp: 3000 },
                style: { background: 'linear-gradient(to top, #200a0a, #4a0000)', accentColor: '#ef4444' },
                storyStart: [
                    { id: 's6', speaker: 'Grid Overlord', text: 'UNAUTHORIZED ACCESS DETECTED. PREPARING DELETION PROTOCOL.', side: 'right', avatar: '💀' },
                    { id: 's7', speaker: 'AI Guide', text: 'It\'s the sector guardian! It has been corrupted. We have to shut it down!', side: 'left', avatar: '🤖' }
                ],
                storyEnd: [{ id: 'e1', speaker: 'AI Guide', text: 'Sector cleared. Access to Frost Byte Tundra granted. It\'s going to get cold.', side: 'left', avatar: '🤖' }],
                rewards: { coins: 500, boosters: [{ type: 'BOMB_BOOSTER', amount: 2 }] }
            },
        ]
    },
    {
        id: 'world_2',
        name: 'Frost Byte Tundra',
        description: 'Sub-zero logic gates. Ice blocks freeze your progress.',
        themeColor: '#a855f7', 
        backgroundGradient: 'linear-gradient(to top, #1e1b4b, #172554)',
        particleColor: '#93c5fd',
        levels: [
            {
                id: 'lvl_2_1', index: 4, worldId: 'world_2',
                title: 'Frozen Gates', description: 'Break the ice. Clear lines twice.',
                mapCoordinates: { x: 20, y: 15 },
                objective: { type: 'LINES', target: 15 }, 
                initialBoard: [{ type: 'ICE', amount: 8, modifierProps: { hits: 2 } }], 
                constraints: { movesLimit: 40 },
                style: { background: 'linear-gradient(to top, #1e293b, #0f172a)', accentColor: '#94a3b8' },
                storyStart: [{ id: 't1', speaker: 'AI Guide', text: 'The cooling systems are leaking. Blue blocks are frozen solid. You need to clear them twice to break through.', side: 'left', avatar: '🤖' }],
                rewards: { coins: 200 }
            },
            {
                id: 'lvl_2_2', index: 5, worldId: 'world_2',
                title: 'Micro-Fracture', description: 'Handle the fragmented data.',
                mapCoordinates: { x: 60, y: 30 },
                objective: { type: 'SCORE', target: 8000 },
                piecePool: ['I', 'J', 'L', 'O', 'S', 'T', 'Z', 'M1', 'D2', 'T3'],
                constraints: { movesLimit: 60 },
                style: { background: 'linear-gradient(to top, #2d132c, #4a1941)', accentColor: '#ec4899' },
                storyStart: [{ id: 's3', speaker: 'AI Guide', text: 'Data fragmentation detected. Small, corrupted blocks are entering the stream. Adapt.', side: 'left', avatar: '🤖' }],
                rewards: { coins: 220 }
            },
            {
                id: 'lvl_2_3', index: 6, worldId: 'world_2',
                title: 'Cold Snap', description: 'Defuse 4 Bombs before they freeze the system.',
                mapCoordinates: { x: 40, y: 50 },
                objective: { type: 'BOMBS', target: 4 },
                initialBoard: [{ type: 'BOMBS', amount: 4, modifierProps: { timer: 20 } }], 
                constraints: { movesLimit: 40 }, 
                style: { background: 'linear-gradient(to top, #2b1111, #4d1818)', accentColor: '#f87171' },
                storyStart: [{ id: 's4', speaker: 'AI Guide', text: 'Logic bombs detected! They are unstable in this temperature. Clear them before the timer hits zero.', side: 'left', avatar: '🤖' }],
                rewards: { coins: 250, boosters: [{ type: 'LINE_CLEARER_BOOSTER', amount: 1 }] }
            },
            {
                id: 'lvl_2_BOSS', index: 7, worldId: 'world_2',
                title: 'THE ARCHITECT', description: 'Defeat the Frozen Core.',
                mapCoordinates: { x: 50, y: 75 },
                objective: { type: 'BOSS', target: 5000 },
                boss: { name: 'The Architect', ability: 'SPEED_SURGE', interval: 10000, maxHp: 5000 }, 
                initialBoard: [{ type: 'BOMBS', amount: 3, modifierProps: { timer: 25 } }, { type: 'GARBAGE', amount: 5 }],
                style: { background: 'radial-gradient(circle, #312e81 0%, #000000 100%)', accentColor: '#a78bfa' },
                storyStart: [{ id: 'w2s5', speaker: 'The Architect', text: 'FREEZE PROGRAM INITIATED. HALT PROCESS.', side: 'right', avatar: '🧊' }],
                storyEnd: [{ id: 'w2e1', speaker: 'AI Guide', text: 'Core thawed. We can proceed to the magma layer. Watch your heat levels.', side: 'left', avatar: '🤖' }],
                rewards: { coins: 1000 }
            }
        ]
    },
    {
        id: 'world_3',
        name: 'Magma Firewall',
        description: 'High heat, high speed. Don\'t get burned.',
        themeColor: '#f59e0b', 
        backgroundGradient: 'linear-gradient(to top, #450a0a, #7f1d1d)',
        particleColor: '#fbbf24',
        levels: [
            {
                id: 'lvl_3_1', index: 8, worldId: 'world_3',
                title: 'Combustion', description: 'Achieve a Combo of 4.',
                mapCoordinates: { x: 80, y: 20 },
                objective: { type: 'COMBO', target: 4 }, 
                initialBoard: [{ type: 'GARBAGE', amount: 5 }], 
                constraints: { movesLimit: 40 },
                style: { background: 'linear-gradient(to top, #4c0519, #831843)', accentColor: '#f472b6' },
                storyStart: [{ id: 'w2s3', speaker: 'AI Guide', text: 'Heat rising. Chain your clears to ventilate the system. We need a 4x Combo.', side: 'left', avatar: '🤖' }],
                rewards: { coins: 350 }
            },
            {
                id: 'lvl_3_2', index: 9, worldId: 'world_3',
                title: 'Heavy Load', description: 'Manage large data chunks.',
                mapCoordinates: { x: 20, y: 40 },
                objective: { type: 'LINES', target: 20 }, 
                piecePool: ['I', 'J', 'L', 'O', 'S', 'T', 'Z', 'P5'],
                constraints: { movesLimit: 50 },
                style: { background: 'linear-gradient(to top, #581c87, #3b0764)', accentColor: '#d8b4fe' },
                storyStart: [{ id: 'w3ts1', speaker: 'AI Guide', text: 'Massive data blocks detected. Pentominos incoming. Use them to clear wide areas.', side: 'left', avatar: '🤖' }],
                rewards: { coins: 375 }
            },
            {
                id: 'lvl_3_BOSS', index: 10, worldId: 'world_3',
                title: 'CORE GUARDIAN', description: 'Extinguish the final flame.',
                mapCoordinates: { x: 50, y: 70 },
                objective: { type: 'BOSS', target: 8000 }, 
                boss: { name: 'Core Guardian', ability: 'GARBAGE_RAIN', interval: 6000, maxHp: 8000 },
                initialBoard: [{ type: 'ICE', amount: 5, modifierProps: { hits: 2 } }],
                style: { background: 'radial-gradient(circle, #713f12 0%, #000000 100%)', accentColor: '#fbbf24' },
                storyStart: [{ id: 'w3s4', speaker: 'Core Guardian', text: 'BURN. DELETE. PURGE.', side: 'right', avatar: '🔥' }],
                storyEnd: [{ id: 'w3end', speaker: 'AI Guide', text: 'System restored. You have saved the network, Operator. Returning to base.', side: 'left', avatar: '🤖' }],
                rewards: { coins: 2500 }
            }
        ]
    }
];

export const ICE_PATTERN_SVG = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3N2Zz4=";
