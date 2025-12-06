
import { STAGE_HEIGHT, STAGE_WIDTH, TETROMINOS, KICKS, MODIFIER_COLORS, COLORS } from '../constants';
import { Board, CellData, TetrominoType, Player, TetrominoShape, Position, CellModifier, AdventureLevelConfig, InitialBoardModifierType, PuzzleDefinition, Tetromino } from '../types';

/**
 * Creates a new empty game board.
 * @param width Grid width (default: 10)
 * @param height Grid height (default: 24)
 * @returns An initialized 2D array representing the board.
 */
export const createStage = (width: number = STAGE_WIDTH, height: number = STAGE_HEIGHT): Board => {
  let h = Math.floor(Math.max(0, height || 0));
  let w = Math.floor(Math.max(0, width || 0));
  
  // Safety caps to prevent memory exhaustion crashes
  if (!Number.isFinite(h) || h > 1000) h = STAGE_HEIGHT; 
  if (!Number.isFinite(w) || w > 100) w = STAGE_WIDTH;

  if (h === 0) h = STAGE_HEIGHT;
  if (w === 0) w = STAGE_WIDTH;
  
  try {
      return Array.from(Array(h), () =>
        Array.from({ length: w }, () => [null, 'clear'] as CellData)
      );
  } catch (e) {
      console.error("Failed to create stage with dims:", w, h, e);
      // Fallback
      return Array.from(Array(STAGE_HEIGHT), () =>
        Array.from({ length: STAGE_WIDTH }, () => [null, 'clear'] as CellData)
      );
  }
};

/**
 * A seedable Random Number Generator using a Linear Congruential Generator (LCG).
 * Useful for deterministic replays and consistent level generation.
 */
export class SeededRNG {
    private _seed: number;
    
    constructor(seed: string) {
        this._seed = this._hashString(seed);
    }

    private _hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; 
        }
        return Math.abs(hash);
    }

    /**
     * Returns a float between 0 and 1.
     */
    public next(): number {
        this._seed = (this._seed * 9301 + 49297) % 233280;
        return this._seed / 233280;
    }
    
    /**
     * Returns an integer between min and max (inclusive).
     */
    public nextInt(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    public get state(): number { return this._seed; }
    public set state(val: number) { this._seed = val; }
}

export const getDailySeed = (): string => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-TETRIOS-DAILY`;
};

export const createPuzzleStage = (puzzle: PuzzleDefinition): Board => {
    const stage = createStage();
    const layout = [...puzzle.layout].reverse();
    
    layout.forEach((rowStr, yIndex) => {
        const stageY = STAGE_HEIGHT - 1 - yIndex;
        if (stageY >= 0) {
            rowStr.split('').forEach((char, x) => {
                if (char === 'X') {
                    stage[stageY][x] = ['G', 'merged'];
                }
            });
        }
    });
    return stage;
};

// Helper to find a random valid position
const findRandomClearPosition = (board: Board, rng: SeededRNG, flippedGravity: boolean, startBuffer: number = 4, attempts: number = 100): Position | null => {
    const height = board.length;
    if (height === 0) return null;
    const width = board[0].length;

    const yStart = flippedGravity ? 0 : startBuffer;
    const yEnd = flippedGravity ? height - startBuffer : height;

    for (let i = 0; i < attempts; i++) {
        const y = Math.floor(rng.next() * (yEnd - yStart)) + yStart;
        const x = Math.floor(rng.next() * width);
        if (board[y] && board[y][x] && board[y][x][1] === 'clear' && !board[y][x][2]) {
            return { x, y };
        }
    }
    return null;
}

export const applyModifierToRandomSlot = (board: Board, rng: SeededRNG, modifier: CellModifier, asGarbage: boolean = false, flippedGravity: boolean = false, attempts: number = 100): boolean => {
    const pos = findRandomClearPosition(board, rng, flippedGravity, 4, attempts);
    if (pos) {
        if (asGarbage) {
            board[pos.y][pos.x] = ['G', 'merged', { ...modifier }];
        } else {
            board[pos.y][pos.x][2] = { ...modifier };
        }
        return true;
    }
    return false;
};

const MODIFIER_HANDLERS: Record<string, (stage: Board, rng: SeededRNG, item: any, flipped: boolean) => void> = {
    'GEMS': (stage, rng, _, flipped) => applyModifierToRandomSlot(stage, rng, { type: 'GEM' }, false, flipped),
    'BOMBS': (stage, rng, item, flipped) => applyModifierToRandomSlot(stage, rng, { type: 'BOMB', timer: item.modifierProps?.timer || 10 }, true, flipped),
    'ICE': (stage, rng, item, flipped) => applyModifierToRandomSlot(stage, rng, { type: 'ICE', hits: item.modifierProps?.hits || 2 }, true, flipped),
    'WILDCARD_BLOCK': (stage, rng, _, flipped) => applyModifierToRandomSlot(stage, rng, { type: 'WILDCARD_BLOCK' }, false, flipped),
    'LASER_BLOCK': (stage, rng, _, flipped) => applyModifierToRandomSlot(stage, rng, { type: 'LASER_BLOCK' }, false, flipped),
    'NUKE_BLOCK': (stage, rng, _, flipped) => applyModifierToRandomSlot(stage, rng, { type: 'NUKE_BLOCK' }, false, flipped),
    'SOFT_BLOCKS': (stage, rng, _, flipped) => applyModifierToRandomSlot(stage, rng, { type: 'SOFT_BLOCK' }, true, flipped),
    'BEDROCK': (stage, rng, _, flipped) => applyModifierToRandomSlot(stage, rng, { type: 'BEDROCK' }, true, flipped),
};

const _populateStageWithInitialBoardItems = (stage: Board, rng: SeededRNG, item: { type: any; amount: number; modifierProps?: { timer?: number; hits?: number; }; }, flippedGravity: boolean): Board => {
    let currentStage = stage;
    const width = stage[0].length;
    const height = stage.length;

    for (let i = 0; i < item.amount; i++) {
        if (item.type === 'GARBAGE') {
            currentStage = addGarbageLines(currentStage, rng, 1, true, flippedGravity);
        } else if (item.type === 'PILLARS') {
            const col = Math.floor(rng.next() * width);
            const pillarHeight = 10 + Math.floor(rng.next() * 5);
            for(let y=0; y<pillarHeight; y++) {
                const stageY = flippedGravity ? y : height - 1 - y;
                if (currentStage[stageY]) {
                    currentStage[stageY][col] = ['G', 'merged', { type: 'BEDROCK' }]; 
                }
            }
        } else {
            const handler = MODIFIER_HANDLERS[item.type];
            if (handler) {
                handler(currentStage, rng, item, flippedGravity);
            }
        }
    }
    return currentStage;
};

export const generateAdventureStage = (config: AdventureLevelConfig, rng: SeededRNG, assistRows: number = 0): Board => {
    let stage = createStage();
    const flippedGravity = config.gimmicks?.some(g => g.type === 'FLIPPED_GRAVITY');

    config.initialBoard?.forEach(item => {
        stage = _populateStageWithInitialBoardItems(stage, rng, item, flippedGravity || false);
    });

    const height = stage.length;
    const width = stage[0].length;

    for (let i = 0; i < assistRows; i++) {
        const rowToClear = flippedGravity ? i : height - 1 - i;
        if (stage[rowToClear]) {
            stage[rowToClear] = Array.from({ length: width }, () => [null, 'clear']);
        }
    }

    return stage;
};

export const addGarbageLines = (stage: Board, rng: SeededRNG, count: number, initialPlacement: boolean = false, flippedGravity: boolean = false): Board => {
    const newStage = stage.map(row => [...row]);
    const width = stage[0]?.length || 0;
    
    if (width === 0) return newStage;

    for(let i=0; i<count; i++) {
        const hole = Math.floor(rng.next() * width);
        const garbageRow: CellData[] = Array.from({ length: width }, (_, x) => 
            x === hole ? [null, 'clear'] : ['G', 'merged']
        );

        if (flippedGravity) {
            if (!initialPlacement) {
                newStage.pop(); 
            }
            newStage.unshift(garbageRow); 
        } else {
            if (!initialPlacement) {
                newStage.shift(); 
            }
            newStage.push(garbageRow); 
        }
    }
    return newStage;
};

export const generateBag = (rng: SeededRNG, customPool?: TetrominoType[], trueRandom: boolean = false): TetrominoType[] => {
  const shapes: TetrominoType[] = customPool ? [...customPool] : ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
  
  if (trueRandom) {
      const randomBag: TetrominoType[] = [];
      for (let i = 0; i < 7; i++) {
          const randomIndex = Math.floor(rng.next() * shapes.length);
          randomBag.push(shapes[randomIndex]);
      }
      return randomBag;
  }

  const bag = [...shapes];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
};

export const rotateMatrix = (matrix: TetrominoShape, dir: number): TetrominoShape => {
  const rotatedGrid = matrix.map((_, index) => matrix.map((col) => col[index]));
  if (dir > 0) return rotatedGrid.map((row) => row.reverse());
  return rotatedGrid.reverse();
};

const rgbCache: Map<string, string> = new Map();

export const parseRgb = (color: string): string => {
    if (!color || typeof color !== 'string') return '255,255,255';
    if (rgbCache.has(color)) return rgbCache.get(color)!;
    
    let res = '255,255,255';
    try {
        if (color.startsWith('rgb')) {
            const openParen = color.indexOf('(');
            const closeParen = color.indexOf(')');
            if (openParen !== -1 && closeParen !== -1) {
                res = color.substring(openParen + 1, closeParen);
                const parts = res.split(',');
                if (parts.length > 3) {
                    res = `${parts[0]},${parts[1]},${parts[2]}`;
                }
            }
        } else if (color.startsWith('#')) {
            let hex = color.substring(1);
            if (hex.length === 3) {
                hex = hex.split('').map(c => c + c).join('');
            }
            if (hex.length >= 6) {
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
                    res = `${r},${g},${b}`;
                }
            }
        }
    } catch (e) {}
    
    rgbCache.set(color, res);
    return res;
};
