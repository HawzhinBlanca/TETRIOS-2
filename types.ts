
export type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z' | 'G' | 'WILDCARD_SHAPE' | 'M1' | 'D2' | 'T3' | 'P5' | 'D2_H' | 'D2_V' | 'T3_L' | 'T3_I' | 'P5_P' | 'P5_X' | 'P5_F';

export interface Tetromino {
  type: TetrominoType;
  shape: TetrominoShape;
  color: string;
}

export type TetrominoShape = (TetrominoType | 0)[][];

export type CellState = 'clear' | 'merged' | 'zoned';

export type CellModifierType = 'GEM' | 'BOMB' | 'ICE' | 'CRACKED_ICE' | 'WILDCARD_BLOCK' | 'LASER_BLOCK' | 'NUKE_BLOCK' | 'SOFT_BLOCK' | 'BEDROCK' | 'SLOW_BLOCK' | 'MULTIPLIER_BLOCK' | 'FREEZE_BLOCK' | 'DRILL_BLOCK';

export interface CellModifier {
    type: CellModifierType;
    timer?: number;
    hits?: number;
}

// Added optional 4th element for Color Override
export type CellData = [TetrominoType | null, CellState, CellModifier?, string?]; 

export type Board = CellData[][];

export interface Position {
  x: number;
  y: number;
}

export interface Player {
  pos: Position;
  tetromino: Tetromino;
  collided: boolean;
  trail: Position[]; // NEW: For Motion Trails
  colorOverride?: string; // Specific color for this instance
  ghostY?: number; // OPTIMIZATION: Cached ghost position
}

export type GameState = 'MENU' | 'COUNTDOWN' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY' | 'MAP' | 'STORY' | 'BOOSTER_SELECTION' | 'WILDCARD_SELECTION' | 'BOMB_SELECTION' | 'LINE_SELECTION' | 'REWINDING' | 'REPLAYING';

export type GameMode = 'MARATHON' | 'TIME_ATTACK' | 'SPRINT' | 'ZEN' | 'MASTER' | 'PUZZLE' | 'BATTLE' | 'ADVENTURE' | 'BLITZ' | 'SURVIVAL' | 'COMBO_MASTER' | 'DAILY';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type ColorblindMode = 'NORMAL' | 'PROTANOPIA' | 'DEUTERANOPIA' | 'TRITANOPIA';

export type BlockSkin = 'NEON' | 'RETRO' | 'MINIMAL' | 'GELATIN' | 'CYBER';

export interface GameSnapshot {
    board: Board;
    player: Player;
    score: number;
    rows: number;
    level: number;
    combo: number;
    b2b: boolean;
    nextQueue: TetrominoType[];
    heldPiece: TetrominoType | null;
    canHold: boolean;
    timestamp: number;
}

export interface ReplayFrame {
    time: number;
    action: KeyAction;
}

export interface ReplayData {
    seed: string;
    mode: GameMode;
    difficulty: Difficulty;
    inputs: ReplayFrame[];
    finalScore: number;
    date: number;
}

export interface GameStats {
  score: number;
  rows: number;
  level: number;
  time: number;
  objectiveProgress?: number;
  movesTaken?: number;
  gemsCollected?: number;
  bombsDefused?: number;
  tetrisesAchieved?: number;
  tspinsAchieved?: number;
  combosAchieved?: number;
  currentB2BChain?: number;
  maxB2BChain?: number;
  bossHp?: number;
  isFrenzyActive?: boolean;
  frenzyTimer?: number;
  focusGauge: number;
  isZoneActive: boolean;
  zoneTimer: number;
  zoneLines: number;
  slowTimeActive?: boolean;
  slowTimeTimer?: number;
  timeFreezeActive?: boolean;
  timeFreezeTimer?: number;
  wildcardAvailable?: boolean;
  bombBoosterReady?: boolean; 
  lineClearerActive?: boolean; 
  flippedGravityActive?: boolean; 
  flippedGravityTimer?: number; 
  isRewinding?: boolean;
  finesseFaults?: number;
  colorStreak?: number; // Track consecutive same-color clears
  lastClearColor?: string;
  colorClears?: Record<string, number>;
  abilities?: AbilityState[]; // Track ability cooldowns
  scoreMultiplierActive?: boolean;
  scoreMultiplierTimer?: number;
}

export interface MoveScore {
  r: number;
  x: number;
  y?: number;
  score: number;
  type?: TetrominoType;
}

export interface AiEvaluationResult {
    bestMove: MoveScore;
    playerMoveScore: number;
    isMissedOpportunity: boolean;
}

export interface WorkerInitPayload {
    STAGE_WIDTH: number;
    STAGE_HEIGHT: number;
    TETROMINOS: Record<string, Tetromino>;
    KICKS: any;
}

export interface WorkerRequest {
    type?: 'INIT' | 'EVALUATE';
    payload?: WorkerInitPayload;
    id: number;
    stage?: Board;
    tetrominoType?: TetrominoType;
    rotationState?: number;
    flippedGravity?: boolean;
    mode?: 'EVALUATE';
    playerMove?: any;
}

export interface WorkerResponse {
    id: number;
    result?: MoveScore | null;
    type?: 'EVALUATION';
    bestMove?: MoveScore;
}

export type FloatingTextVariant = 'default' | 'gem' | 'bomb' | 'frenzy' | 'powerup' | 'zone' | 'coach' | 'achievement' | 'fault' | 'rhythm';

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  life: number;
  color: string;
  scale: number;
  initialScale: number;
  variant?: FloatingTextVariant;
}

export type KeyAction = 'moveLeft' | 'moveRight' | 'softDrop' | 'hardDrop' | 'rotateCW' | 'rotateCCW' | 'hold' | 'zone' | 'rewind' | 'ability1' | 'ability2' | 'ability3';

export type KeyMap = Record<KeyAction, string[]>;

export type GhostStyle = 'neon' | 'dashed' | 'solid';

export interface BoardRenderConfig {
    cellSize: number;
    ghostStyle: GhostStyle;
    ghostOpacity: number;
    ghostOutlineThickness: number;
    ghostGlowIntensity: number;
    ghostShadow?: string;
    lockWarningEnabled: boolean;
    showAi: boolean;
    aiHint?: MoveScore | null; 
    pieceIsGrounded: boolean;
    wildcardPieceAvailable: boolean; 
    gimmicks?: any;
    flippedGravity: boolean;
    bombSelectionRows?: number[];
    lineClearerSelectedRow?: number | null;
    bombBoosterTarget?: Position | null;
    colorblindMode: ColorblindMode;
    isZoneActive: boolean;
    zoneLines: number;
    missedOpportunity: MoveScore | null;
    blockSkin: BlockSkin;
}

export type VisualEffectType = 
    | 'SHAKE' 
    | 'PARTICLE' 
    | 'FLASH' 
    | 'FRENZY_START' 
    | 'FRENZY_END' 
    | 'POWERUP_ACTIVATE' 
    | 'BLITZ_SPEED_THRESHOLD' 
    | 'FLIPPED_GRAVITY_ACTIVATE' 
    | 'FLIPPED_GRAVITY_END'
    | 'HARD_DROP_BEAM'
    | 'ROW_CLEAR'
    | 'ZONE_START'
    | 'ZONE_END'
    | 'ZONE_CLEAR'
    | 'SHOCKWAVE'
    | 'TSPIN_CLEAR';

export interface VisualEffectPayload {
    type: VisualEffectType;
    payload?: any;
}

export type AudioEvent = 
    | 'MOVE' | 'ROTATE' | 'SOFT_DROP' | 'HARD_DROP' | 'LOCK' | 'SOFT_LAND'
    | 'TSPIN' | 'CLEAR_1' | 'CLEAR_2' | 'CLEAR_3' | 'CLEAR_4'
    | 'GAME_OVER' | 'VICTORY'
    | 'FRENZY_START' | 'FRENZY_END'
    | 'ZONE_START' | 'ZONE_END' | 'ZONE_CLEAR'
    | 'WILDCARD_SPAWN'
    | 'LASER_CLEAR' | 'NUKE_CLEAR' | 'NUKE_SPAWN'
    | 'BOMB_ACTIVATE' | 'LINE_CLEARER_ACTIVATE'
    | 'BLITZ_SPEEDUP'
    | 'GRAVITY_FLIP_START' | 'GRAVITY_FLIP_END'
    | 'LEVEL_UP'
    | 'UI_HOVER' | 'UI_CLICK' | 'UI_SELECT' | 'UI_BACK'
    | 'BOSS_DAMAGE'
    | 'COUNTDOWN'
    | 'REWIND'
    | 'COACH_WARN'
    | 'ACHIEVEMENT_UNLOCK'
    | 'FINESSE_FAULT'
    | 'RHYTHM_CLEAR'
    | 'ABILITY_READY' | 'ABILITY_ACTIVATE';

export interface LevelRewards {
    coins: number;
    stars: number;
    boosterRewards?: { type: any; amount: number }[];
}

export interface AdventureLevelConfig {
    id: string;
    index: number;
    worldId: string;
    title: string;
    description: string;
    mapCoordinates?: { x: number; y: number };
    objective: {
        type: LevelObjectiveType;
        target: number;
        targetColor?: string; // For Color Linked Objectives
    };
    constraints?: {
        movesLimit?: number;
        timeLimit?: number;
    };
    initialBoard?: {
        type: any;
        amount: number;
        modifierProps?: { timer?: number; hits?: number };
    }[];
    gimmicks?: {
        type: any;
        config?: any;
    }[];
    boss?: {
        name: string;
        ability: string;
        interval: number;
        maxHp?: number;
    };
    style: {
        background: string;
        accentColor: string;
    };
    storyStart?: StoryNode[];
    storyEnd?: StoryNode[];
    tutorialTip?: { text: string };
    rewards?: {
        coins: number;
        boosters?: { type: any; amount: number }[];
    };
    // Pro Features
    piecePool?: TetrominoType[];
    rules?: GameRule[];
}

export type GameRule = 'COLOR_CHAOS' | 'NO_HOLD';

export interface AdventureWorld {
    id: string;
    name: string;
    description: string;
    themeColor: string;
    backgroundGradient: string;
    particleColor: string;
    levels: AdventureLevelConfig[];
}

export interface Booster {
    type: BoosterType;
    name: string;
    description: string;
    icon: string;
    initialQuantity?: number;
    cost: number;
}

export type BoosterType = 'BOMB_BOOSTER' | 'SLOW_TIME_BOOSTER' | 'PIECE_SWAP_BOOSTER' | 'LINE_CLEARER_BOOSTER' | 'FLIPPED_GRAVITY_BOOSTER';

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
}

export interface GameCallbacks {
    onVisualEffect: (effect: any) => void;
    onAudio: (event: any, val?: number, type?: TetrominoType) => void;
    onGameOver: (state: GameState, currentLevelId?: string, rewards?: LevelRewards) => void;
    onAchievementUnlocked: (id: string) => void;
    onFastScoreUpdate: (score: number, time: number) => void; // NEW: React-less HUD
}

export type InitialBoardModifierType = 'GEMS' | 'BOMBS' | 'ICE' | 'GARBAGE' | 'WILDCARD_BLOCK' | 'LASER_BLOCK' | 'NUKE_BLOCK' | 'PILLARS' | 'SOFT_BLOCKS' | 'BEDROCK' | 'SLOW_BLOCK' | 'MULTIPLIER_BLOCK' | 'FREEZE_BLOCK' | 'DRILL_BLOCK';
export type LevelObjectiveType = 'LINES' | 'SCORE' | 'TIME_SURVIVAL' | 'GEMS' | 'BOMBS' | 'TETRIS' | 'TSPIN' | 'COMBO' | 'BOSS' | 'MOVES' | 'B2B_CHAIN' | 'COLOR_MATCH';
export type GameGimmickType = 'INVISIBLE_ROWS' | 'FLIPPED_GRAVITY';
export interface StoryNode { id: string; speaker: string; text: string; side?: 'left' | 'right'; avatar?: string; }
export interface ScoreResult { score: number; text: string; isBackToBack: boolean; soundLevel: number; visualShake: 'hard' | 'soft' | null; }

// --- ABILITIES ---
export type AbilityType = 'COLOR_SWAP' | 'COLUMN_NUKE' | 'PIECE_SCULPT';

export interface AbilityConfig {
    id: AbilityType;
    name: string;
    description: string;
    icon: any; // Lucide icon name
    cooldownMs: number;
    color: string;
}

export interface AbilityState {
    id: AbilityType;
    cooldownTimer: number; // 0 means ready
    isReady: boolean;
    totalCooldown: number;
}

export interface PuzzleDefinition {
    layout: string[];
}
