
import { STAGE_HEIGHT, STAGE_WIDTH, TETROMINOS, KICKS, MODIFIER_COLORS, COLORS } from '../constants';
import { Board, CellData, TetrominoType, Player, TetrominoShape, Position, CellModifier, AdventureLevelConfig, InitialBoardModifierType, PuzzleDefinition } from '../types';

export const createStage = (width: number = STAGE_WIDTH, height: number = STAGE_HEIGHT): Board => {
  // Safety: Ensure integer dimensions >= 0 to prevent 'Invalid array length' errors
  // Explicitly handle NaN or undefined by defaulting to 0 in Math.max
  const h = Math.floor(Math.max(0, height || 0));
  const w = Math.floor(Math.max(0, width || 0));
  // If height is 0, return empty array immediately to avoid potential issues down the line
  if (h === 0) return [];
  
  try {
      return Array.from(Array(h), () =>
        Array.from({ length: w }, () => [null, 'clear'] as CellData)
      );
  } catch (e) {
      console.error("Failed to create stage", e);
      return [];
  }
};

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
            hash = hash & hash; 
        }
        return Math.abs(hash);
    }

    public next(): number {
        this._seed = (this._seed * 9301 + 49297) % 233280;
        return this._seed / 233280;
    }
    
    public nextInt(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }
}

let rngInstance: SeededRNG | null = null;

export const setRngSeed = (seed: string | null) => {
    if (seed) rngInstance = new SeededRNG(seed);
    else rngInstance = null;
};

const random = (): number => {
    return rngInstance ? rngInstance.next() : Math.random();
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

export const fillRandomClearCell = (board: Board, modifier: CellModifier, attempts: number = 100, flippedGravity: boolean = false): boolean => {
    const height = board.length;
    if (height === 0) return false;
    const width = board[0].length;
    
    for (let i = 0; i < attempts; i++) {
        const startBuffer = 4; 
        const yStart = flippedGravity ? 0 : startBuffer;
        const yEnd = flippedGravity ? height - startBuffer : height;
        const y = Math.floor(random() * (yEnd - yStart)) + yStart;
        
        const x = Math.floor(random() * width);
        if (board[y] && board[y][x] && board[y][x][1] === 'clear' && !board[y][x][2]) {
            board[y][x][2] = { ...modifier }; 
            return true;
        }
    }
    return false;
};

export const fillRandomWithGarbageAndModifier = (board: Board, modifier: CellModifier, attempts: number = 100, flippedGravity: boolean = false): boolean => {
    const height = board.length;
    if (height === 0) return false;
    const width = board[0].length;

    for (let i = 0; i < attempts; i++) {
        const startBuffer = 4; 
        const yStart = flippedGravity ? 0 : startBuffer;
        const yEnd = flippedGravity ? height - startBuffer : height;
        const y = Math.floor(random() * (yEnd - yStart)) + yStart;
        const x = Math.floor(random() * width);
        
        if (board[y] && board[y][x] && board[y][x][1] === 'clear' && !board[y][x][2]) {
            board[y][x] = ['G', 'merged', { ...modifier }];
            return true;
        }
    }
    return false;
};

const _populateStageWithInitialBoardItems = (stage: Board, item: { type: any; amount: number; modifierProps?: { timer?: number; hits?: number; }; }, flippedGravity: boolean): Board => {
    let currentStage = stage;
    const width = stage[0].length;
    const height = stage.length;

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
                fillRandomWithGarbageAndModifier(currentStage, { type: 'BEDROCK' }, 100, flippedGravity);
                break;
            case 'PILLARS':
                const col = Math.floor(random() * width);
                const pillarHeight = 10 + Math.floor(random() * 5);
                for(let y=0; y<pillarHeight; y++) {
                    const stageY = flippedGravity ? y : height - 1 - y;
                    if (currentStage[stageY]) {
                        currentStage[stageY][col] = ['G', 'merged', { type: 'BEDROCK' }]; 
                    }
                }
                break;
        }
    }
    return currentStage;
};

export const generateAdventureStage = (config: AdventureLevelConfig, assistRows: number = 0): Board => {
    // Adventure mode typically uses standard grid unless overridden, but we respect mobile dynamic height here too if passed implicitly
    // However, for now we use default unless context changes
    let stage = createStage();
    const flippedGravity = config.gimmicks?.some(g => g.type === 'FLIPPED_GRAVITY');

    config.initialBoard?.forEach(item => {
        stage = _populateStageWithInitialBoardItems(stage, item, flippedGravity || false);
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

export const addGarbageLines = (stage: Board, count: number, initialPlacement: boolean = false, flippedGravity: boolean = false): Board => {
    const newStage = stage.map(row => [...row]);
    const width = stage[0]?.length || 0;
    
    if (width === 0) return newStage;

    for(let i=0; i<count; i++) {
        const hole = Math.floor(random() * width);
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

export const generateBag = (customPool?: TetrominoType[]): TetrominoType[] => {
  const shapes: TetrominoType[] = customPool ? [...customPool] : ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
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
