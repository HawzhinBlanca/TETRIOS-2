


export type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z' | 'G' | 'WILDCARD_SHAPE'; // G for Garbage, WILDCARD_SHAPE for wildcard piece

export interface Tetromino {
  type: TetrominoType;
  shape: TetrominoShape;
  color: string;
}

export type TetrominoShape = (TetrominoType | 0)[][];

export type CellState = 'clear' | 'merged';

export type CellModifierType = 'GEM' | 'BOMB' | 'ICE' | 'CRACKED_ICE' | 'WILDCARD_BLOCK' | 'LASER_BLOCK' | 'NUKE_BLOCK';

export interface CellModifier {
    type: CellModifierType;
    timer?: number; // For bombs, turns remaining
    hits?: number; // For ICE blocks, hits remaining
}

// Updated CellData to include optional modifier
export type CellData = [TetrominoType | null, CellState, CellModifier?]; 

export type Board = CellData[][];

export interface Position {
  x: number;
  y: number;
}

export interface Player {
  pos: Position;
  tetromino: Tetromino;
  collided: boolean;
}

export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY' | 'MAP' | 'STORY' | 'BOOSTER_SELECTION' | 'WILDCARD_SELECTION' | 'BOMB_SELECTION' | 'LINE_SELECTION';

export type GameMode = 'MARATHON' | 'TIME_ATTACK' | 'SPRINT' | 'ZEN' | 'MASTER' | 'PUZZLE' | 'BATTLE' | 'ADVENTURE' | 'BLITZ';

export interface GameStats {
  score: number;
  rows: number;
  level: number;
  time: number; // Used for elapsed time or remaining time depending on mode
  objectiveProgress?: number; // Current progress towards adventure objective
  // New adventure objective related stats
  movesTaken?: number;
  gemsCollected?: number;
  bombsDefused?: number;
  tetrisesAchieved?: number;
  combosAchieved?: number;
  // Frenzy Mode stats
  isFrenzyActive?: boolean;
  frenzyTimer?: number;
  // Booster related stats
  slowTimeActive?: boolean;
  slowTimeTimer?: number;
  wildcardAvailable?: boolean;
  bombBoosterReady?: boolean; 
  lineClearerActive?: boolean; 
  flippedGravityActive?: boolean; 
  flippedGravityTimer?: number; 
}

// AI Types
export interface MoveScore {
  r: number; // rotation (0-3)
  x: number; // x position
  y?: number; // calculated drop y position
  score: number;
}

export type FloatingTextVariant = 'default' | 'gem' | 'bomb' | 'frenzy' | 'powerup';

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  life: number; // 0 to 1
  color: string;
  scale: number;
  initialScale: number; // Added for floating text animation
  variant?: FloatingTextVariant; // Added for different visual styles
}

export type KeyAction = 'moveLeft' | 'moveRight' | 'softDrop' | 'hardDrop' | 'rotateCW' | 'rotateCCW' | 'hold';

export type KeyMap = Record<KeyAction, string[]>;

export type GhostStyle = 'neon' | 'dashed' | 'solid';

// Renderer Types
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
    // Adventure mode specific rendering configs
    gimmicks?: AdventureLevelConfig['gimmicks'];
    flippedGravity: boolean; // Pass flipped gravity state to renderer
    bombSelectionRows?: number[]; // Rows highlighted for bomb selection
    lineClearerSelectedRow?: number | null; // New: Row highlighted for line clearer
    bombBoosterTarget?: Position | null; // For 2x2 bomb selection
}

// Visual Effect Types (Discriminated Union)
interface ParticlePayload {
  isExplosion?: boolean;
  isBurst?: boolean;
  clearedRows?: number[] | number;
  y?: number;
  x?: number;
  color?: string;
  amount?: number;
}

interface FlashPayload {
  color?: string;
  duration?: number;
}

interface ShakeVisualEffect { 
  type: 'SHAKE'; 
  payload?: 'hard' | 'soft'; 
}
interface ParticleVisualEffect { 
  type: 'PARTICLE'; 
  payload?: ParticlePayload; 
}
interface FlashVisualEffect { 
  type: 'FLASH'; 
  payload?: FlashPayload; 
}
interface FrenzyVisualEffect {
  type: 'FRENZY_START' | 'FRENZY_END';
  payload?: { color?: string; };
}
interface PowerupActivateVisualEffect {
  type: 'POWERUP_ACTIVATE';
  payload?: { type: CellModifierType | BoosterType; x?: number; y?: number; color?: string; }; 
}
interface BlitzSpeedThresholdEffect { 
  type: 'BLITZ_SPEED_THRESHOLD';
  payload?: { threshold: number };
}
interface FlippedGravityVisualEffect { 
  type: 'FLIPPED_GRAVITY_ACTIVATE' | 'FLIPPED_GRAVITY_END';
  payload?: { color?: string; };
}

export type VisualEffectPayload = ShakeVisualEffect | ParticleVisualEffect | FlashVisualEffect | FrenzyVisualEffect | PowerupActivateVisualEffect | BlitzSpeedThresholdEffect | FlippedGravityVisualEffect;

// Adventure Mode Types
export interface StoryNode {
    id: string;
    speaker: string;
    text: string;
    avatar?: string; // Emoji or url
    side?: 'left' | 'right';
}

export type LevelObjectiveType = 'LINES' | 'TIME_SURVIVAL' | 'SCORE' | 'BOSS' | 'GEMS' | 'BOMBS' | 'TETRIS' | 'MOVES' | 'COMBO';
export type InitialBoardModifierType = 'GEMS' | 'BOMBS' | 'ICE' | 'GARBAGE' | 'WILDCARD_BLOCK' | 'LASER_BLOCK' | 'NUKE_BLOCK';
export type GameGimmickType = 'INVISIBLE_ROWS' | 'FLIPPED_GRAVITY';

export interface AdventureLevelConfig {
    id: string;
    index: number;
    title: string;
    description: string;
    worldId: string;
    objective: {
        type: LevelObjectiveType;
        target: number; // Lines count, seconds, score, Boss HP, Gems count, Tetris count, Combo count
    };
    constraints?: {
        movesLimit?: number; // Optional move limit (max moves)
        timeLimit?: number; // Optional time limit (seconds)
    };
    initialBoard?: {
        type: InitialBoardModifierType;
        amount: number;
        modifierProps?: { timer?: number; hits?: number; };
    }[];
    boss?: {
        name: string;
        ability: 'GARBAGE_RAIN' | 'SPEED_SURGE';
        interval: number; // ms
    };
    gimmicks?: {
        type: GameGimmickType;
        config?: any; 
    }[];
    tutorialTip?: { text: string; }; 
    storyStart?: StoryNode[];
    storyEnd?: StoryNode[];
    style: {
        background: string;
        accentColor: string;
    };
    rewards?: {
        coins?: number;
        boosters?: { type: BoosterType; amount: number; }[];
    }
}

export interface AdventureWorld {
    id: string;
    name: string;
    description: string;
    themeColor: string;
    levels: AdventureLevelConfig[];
}

// Boosters and Power-Ups
export type BoosterType = 'BOMB_BOOSTER' | 'SLOW_TIME_BOOSTER' | 'PIECE_SWAP_BOOSTER' | 'LINE_CLEARER_BOOSTER' | 'FLIPPED_GRAVITY_BOOSTER';

export interface Booster {
    type: BoosterType;
    name: string;
    description: string;
    icon: string; // Emoji or asset URL
    cost: number; // Coins
    initialQuantity?: number; // For initial game setup
}

export interface LevelRewards {
    coins: number;
    stars: number;
    boosterRewards?: { type: BoosterType; amount: number; }[];
}

export type AudioEvent = 
  'MOVE' | 'ROTATE' | 'SOFT_DROP' | 'HARD_DROP' | 'LOCK' | 'SOFT_LAND' |
  'CLEAR_1' | 'CLEAR_2' | 'CLEAR_3' | 'CLEAR_4' | 'TSPIN' | 
  'GAME_OVER' | 'VICTORY' | 
  'FRENZY_START' | 'FRENZY_END' | 
  'WILDCARD_SPAWN' | 'LASER_CLEAR' | 'NUKE_CLEAR' | 'NUKE_SPAWN' | 
  'BOMB_ACTIVATE' | 'LINE_CLEARER_ACTIVATE' | 
  'BLITZ_SPEEDUP' | 'GRAVITY_FLIP_START' | 'GRAVITY_FLIP_END' | 'BOSS_DAMAGE' |
  'UI_HOVER' | 'UI_CLICK' | 'UI_SELECT' | 'UI_BACK';

// Callbacks for GameCore
export interface GameCallbacks {
    onStateChange: (newState: GameState, previousState: GameState) => void; // New FSM callback
    onStatsChange: (stats: GameStats) => void;
    onQueueChange: (queue: TetrominoType[]) => void;
    onHoldChange: (piece: TetrominoType | null, canHold: boolean) => void;
    onVisualEffect: (effect: VisualEffectPayload) => void;
    onGameOver: (state: GameState, currentLevelId?: string, rewards?: LevelRewards) => void;
    onAiTrigger: () => void;
    onComboChange: (combo: number, isB2B: boolean) => void;
    onGarbageChange: (garbage: number) => void;
    onGroundedChange: (isGrounded: boolean) => void;
    onFlippedGravityChange: (isFlipped: boolean) => void;
    onWildcardSelectionTrigger: () => void; 
    onWildcardAvailableChange: (available: boolean) => void; 
    onSlowTimeChange: (active: boolean, timer: number) => void; 
    onBombBoosterReadyChange: (ready: boolean) => void; 
    onBombSelectionStart: (rowsToClear: number) => void; 
    onBombSelectionEnd: () => void; 
    onLineClearerActiveChange: (active: boolean) => void; 
    onLineSelectionStart: () => void; 
    onLineSelectionEnd: () => void; 
    onBlitzSpeedUp?: (threshold: number) => void; 
    onFlippedGravityTimerChange?: (active: boolean, timer: number) => void;
    onAudio: (event: AudioEvent) => void;
}

// Score Result Interface
export interface ScoreResult {
  score: number;
  text: string;
  isBackToBack: boolean;
  soundLevel: number; // Represents the number of lines cleared for sound purposes
  visualShake: 'hard' | 'soft' | null;
}

// Extend Window interface for webkitAudioContext
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
