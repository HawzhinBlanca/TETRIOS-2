
import { STAGE_HEIGHT, STAGE_WIDTH, TETROMINOS, KICKS, PuzzleDefinition, MODIFIER_COLORS, COLORS } from '../constants';
import { Board, CellData, TetrominoType, Player, TetrominoShape, Position, CellModifier, AdventureLevelConfig, InitialBoardModifierType } from '../types';

/**
 * Creates an empty game stage filled with 'clear' cells.
 */
export const createStage = (width: number = STAGE_WIDTH, height: number = STAGE_HEIGHT): Board =>
  Array.from(Array(height), () =>
    Array.from({ length: width }, () => [null, 'clear'] as CellData)
  );

// --- SEEDED RNG ---
// Simple LCG (Linear Congruential Generator)
class SeededRNG {
    private _seed: number;
    
    constructor(seed: string) {
        this._seed = this._hashString(seed);
    }

    private _hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }

    // Returns 0 <= x < 1
    public next(): number {
        this._seed = (this._seed * 9301 + 49297) % 233280;
        return this._seed / 233280;
    }
    
    public nextInt(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }
}

// Singleton instance holder
let rngInstance: SeededRNG | null = null;

export const setRngSeed = (seed: string | null) => {
    if (seed) rngInstance = new SeededRNG(seed);
    else rngInstance = null;
};

const random = (): number => {
    return rngInstance ? rngInstance.next() : Math.random();
};

/**
 * Creates a game stage based on a puzzle definition.
 */
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

/**
 * Fills a random clear cell on the board with a given modifier.
 */
export const fillRandomClearCell = (board: Board, modifier: CellModifier, attempts: number = 100, flippedGravity: boolean = false): boolean => {
    for (let i = 0; i < attempts; i++) {
        const startBuffer = 4; 
        const yStart = flippedGravity ? 0 : startBuffer;
        const yEnd = flippedGravity ? STAGE_HEIGHT - startBuffer : STAGE_HEIGHT;
        const y = Math.floor(random() * (yEnd - yStart)) + yStart;
        
        const x = Math.floor(random() * STAGE_WIDTH);
        if (board[y][x][1] === 'clear' && !board[y][x][2]) {
            board[y][x][2] = { ...modifier }; 
            return true;
        }
    }
    return false;
};

/**
 * Creates a Garbage Block with a specific modifier in a random location.
 * Used for BOMB and ICE which typically are attached to blocks.
 */
export const fillRandomWithGarbageAndModifier = (board: Board, modifier: CellModifier, attempts: number = 100, flippedGravity: boolean = false): boolean => {
    for (let i = 0; i < attempts; i++) {
        const startBuffer = 4; 
        const yStart = flippedGravity ? 0 : startBuffer;
        const yEnd = flippedGravity ? STAGE_HEIGHT - startBuffer : STAGE_HEIGHT;
        const y = Math.floor(random() * (yEnd - yStart)) + yStart;
        const x = Math.floor(random() * STAGE_WIDTH);
        
        if (board[y][x][1] === 'clear' && !board[y][x][2]) {
            // Create a 'merged' Garbage block with the modifier
            board[y][x] = ['G', 'merged', { ...modifier }];
            return true;
        }
    }
    return false;
};

/**
 * Helper to populate the stage with initial board items.
 */
const _populateStageWithInitialBoardItems = (stage: Board, item: { type: any; amount: number; modifierProps?: { timer?: number; hits?: number; }; }, flippedGravity: boolean): Board => {
    let currentStage = stage;
    for (let i = 0; i < item.amount; i++) {
        switch (item.type) {
            case 'GEMS':
                fillRandomClearCell(currentStage, { type: 'GEM' }, 100, flippedGravity);
                break;
            case 'BOMBS':
                fillRandomWithGarbageAndModifier(currentStage, { type: 'BOMB', timer: item.modifierProps?.timer || 10 }, 100, flippedGravity);
                break;
            case 'ICE':
                fillRandomWithGarbageAndModifier(currentStage, { type: 'ICE', hits: item.modifierProps?.hits || 2 }, 100, flippedGravity);
                break;
            case 'GARBAGE':
                currentStage = addGarbageLines(currentStage, 1, true, flippedGravity); 
                break;
            case 'WILDCARD_BLOCK':
                fillRandomClearCell(currentStage, { type: 'WILDCARD_BLOCK' }, 100, flippedGravity);
                break;
            case 'LASER_BLOCK':
                fillRandomClearCell(currentStage, { type: 'LASER_BLOCK' }, 100, flippedGravity);
                break;
            case 'NUKE_BLOCK': 
                fillRandomClearCell(currentStage, { type: 'NUKE_BLOCK' }, 100, flippedGravity);
                break;
            case 'SOFT_BLOCKS':
                fillRandomWithGarbageAndModifier(currentStage, { type: 'SOFT_BLOCK' }, 100, flippedGravity);
                break;
            case 'BEDROCK':
                // Bedrock: Permanent obstacles. Fill random location with garbage + BEDROCK modifier
                fillRandomWithGarbageAndModifier(currentStage, { type: 'BEDROCK' }, 100, flippedGravity);
                break;
            case 'PILLARS':
                // Add a vertical column of garbage (Obstacle)
                const col = Math.floor(random() * STAGE_WIDTH);
                const height = 10 + Math.floor(random() * 5);
                for(let y=0; y<height; y++) {
                    const stageY = flippedGravity ? y : STAGE_HEIGHT - 1 - y;
                    if (currentStage[stageY]) {
                        currentStage[stageY][col] = ['G', 'merged', { type: 'BEDROCK' }]; // Use BEDROCK modifier to make them permanent
                    }
                }
                break;
        }
    }
    return currentStage;
};

/**
 * Generates an adventure game stage based on configuration.
 */
export const generateAdventureStage = (config: AdventureLevelConfig, assistRows: number = 0): Board => {
    let stage = createStage();
    const flippedGravity = config.gimmicks?.some(g => g.type === 'FLIPPED_GRAVITY');

    config.initialBoard?.forEach(item => {
        stage = _populateStageWithInitialBoardItems(stage, item, flippedGravity || false);
    });

    // Player assist: clear bottom (or top if flipped) rows
    for (let i = 0; i < assistRows; i++) {
        const rowToClear = flippedGravity ? i : STAGE_HEIGHT - 1 - i;
        if (stage[rowToClear]) {
            stage[rowToClear] = Array.from({ length: STAGE_WIDTH }, () => [null, 'clear']);
        }
    }

    return stage;
};

/**
 * Adds a specified number of garbage lines to the bottom (or top if flipped) of the stage.
 */
export const addGarbageLines = (stage: Board, count: number, initialPlacement: boolean = false, flippedGravity: boolean = false): Board => {
    const newStage = stage.map(row => [...row]);
    for(let i=0; i<count; i++) {
        const hole = Math.floor(random() * STAGE_WIDTH);
        // Create independent cells for garbage row
        const garbageRow: CellData[] = Array.from({ length: STAGE_WIDTH }, (_, x) => 
            x === hole ? [null, 'clear'] : ['G', 'merged']
        );

        if (flippedGravity) {
            if (!initialPlacement) {
                newStage.pop(); // Remove bottom row if not initial placement
            }
            newStage.unshift(garbageRow); // Add to top
        } else {
            if (!initialPlacement) {
                newStage.shift(); // Remove top row if not initial placement
            }
            newStage.push(garbageRow); // Add to bottom
        }
    }
    return newStage;
};

// Support custom pools. If no pool provided, use standard bag.
export const generateBag = (customPool?: TetrominoType[]): TetrominoType[] => {
  const shapes: TetrominoType[] = customPool ? [...customPool] : ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
  
  // Shuffle
  for (let i = shapes.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shapes[i], shapes[j]] = [shapes[j], shapes[i]];
  }
  return shapes;
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
