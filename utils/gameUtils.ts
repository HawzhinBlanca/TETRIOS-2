
import { STAGE_HEIGHT, STAGE_WIDTH, TETROMINOS, KICKS, PuzzleDefinition, MODIFIER_COLORS, COLORS } from '../constants';
import { Board, CellData, TetrominoType, Player, TetrominoShape, Position, CellModifier, AdventureLevelConfig, InitialBoardModifierType } from '../types';

/**
 * Creates an empty game stage filled with 'clear' cells.
 * @param {number} width Optional width, defaults to STAGE_WIDTH.
 * @param {number} height Optional height, defaults to STAGE_HEIGHT.
 * @returns {Board} A new game board.
 */
export const createStage = (width: number = STAGE_WIDTH, height: number = STAGE_HEIGHT): Board =>
  Array.from(Array(height), () =>
    new Array(width).fill([null, 'clear'])
  );

/**
 * Creates a game stage based on a puzzle definition.
 * @param {PuzzleDefinition} puzzle The puzzle definition including layout.
 * @returns {Board} A new game board with puzzle blocks.
 */
export const createPuzzleStage = (puzzle: PuzzleDefinition): Board => {
    const stage = createStage();
    // Map layout from bottom up
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
 * Ensures the modifier is not placed in the top few rows to avoid immediate game over
 * or near the bottom if gravity is flipped.
 * @param {Board} board The board to modify.
 * @param {CellModifier} modifier The modifier to place.
 * @param {number} [attempts=100] Max attempts to find a clear cell.
 * @param {boolean} [flippedGravity=false] If true, avoid placing near bottom instead of top.
 * @returns {boolean} True if successfully placed, false otherwise.
 */
export const fillRandomClearCell = (board: Board, modifier: CellModifier, attempts: number = 100, flippedGravity: boolean = false): boolean => {
    for (let i = 0; i < attempts; i++) {
        // If flipped, avoid placing near bottom where pieces start.
        // If not flipped, avoid placing near top where pieces start.
        const startBuffer = 4; // Number of rows to avoid from spawn area
        const yStart = flippedGravity ? 0 : startBuffer;
        const yEnd = flippedGravity ? STAGE_HEIGHT - startBuffer : STAGE_HEIGHT;
        const y = Math.floor(Math.random() * (yEnd - yStart)) + yStart;
        
        const x = Math.floor(Math.random() * STAGE_WIDTH);
        if (board[y][x][1] === 'clear' && !board[y][x][2]) { // Also check no other modifier
            board[y][x][2] = modifier;
            return true;
        }
    }
    return false;
};

/**
 * Helper to populate the stage with initial board items (Gems, Bombs, Ice, Garbage, Wildcard, Laser).
 * @param {Board} stage The current game board.
 * @param {{ type: InitialBoardModifierType; amount: number; modifierProps?: { timer?: number; hits?: number; }; }} item The item configuration.
 * @param {boolean} flippedGravity If true, modifiers are placed considering flipped gravity.
 * @returns {Board} The updated stage.
 */
const _populateStageWithInitialBoardItems = (stage: Board, item: { type: InitialBoardModifierType; amount: number; modifierProps?: { timer?: number; hits?: number; }; }, flippedGravity: boolean): Board => {
    let currentStage = stage;
    for (let i = 0; i < item.amount; i++) {
        switch (item.type) {
            case 'GEMS':
                fillRandomClearCell(currentStage, { type: 'GEM' }, 100, flippedGravity);
                break;
            case 'BOMBS':
                fillRandomClearCell(currentStage, { type: 'BOMB', timer: item.modifierProps?.timer || 10 }, 100, flippedGravity);
                break;
            case 'ICE':
                fillRandomClearCell(currentStage, { type: 'ICE', hits: item.modifierProps?.hits || 2 }, 100, flippedGravity);
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
            case 'NUKE_BLOCK': // Added NUKE_BLOCK
                fillRandomClearCell(currentStage, { type: 'NUKE_BLOCK' }, 100, flippedGravity);
                break;
        }
    }
    return currentStage;
};


/**
 * Generates an adventure game stage based on configuration, populating it with modifiers or garbage.
 * @param {AdventureLevelConfig} config The adventure level configuration.
 * @param {number} [assistRows=0] Number of initial rows to clear for player assist.
 * @returns {Board} A new game board for the adventure level.
 */
export const generateAdventureStage = (config: AdventureLevelConfig, assistRows: number = 0): Board => {
    let stage = createStage(); // Use let because addGarbageLines returns a new board
    const flippedGravity = config.gimmicks?.some(g => g.type === 'FLIPPED_GRAVITY');

    config.initialBoard?.forEach(item => {
        stage = _populateStageWithInitialBoardItems(stage, item, flippedGravity || false);
    });

    // Player assist: clear bottom (or top if flipped) rows
    for (let i = 0; i < assistRows; i++) {
        const rowToClear = flippedGravity ? i : STAGE_HEIGHT - 1 - i;
        if (stage[rowToClear]) {
            stage[rowToClear].fill([null, 'clear']);
        }
    }

    return stage;
};


/**
 * Adds a specified number of garbage lines to the bottom (or top if flipped) of the stage.
 * @param {Board} stage The current game board.
 * @param {number} count The number of garbage lines to add.
 * @param {boolean} [initialPlacement=false] If true, adds garbage without removing opposite end row (for initial level setup).
 * @param {boolean} [flippedGravity=false] If true, garbage is added to the top and board shifts down.
 * @returns {Board} The updated game board.
 */
export const addGarbageLines = (stage: Board, count: number, initialPlacement: boolean = false, flippedGravity: boolean = false): Board => {
    const newStage = stage.map(row => [...row]);
    for(let i=0; i<count; i++) {
        const hole = Math.floor(Math.random() * STAGE_WIDTH);
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

/**
 * Generates a shuffled bag of Tetromino types (7-bag system).
 * @returns {TetrominoType[]} An array of shuffled Tetromino types.
 */
export const generateBag = (): TetrominoType[] => {
  const shapes: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
  for (let i = shapes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shapes[i], shapes[j]] = [shapes[j], shapes[i]];
  }
  return shapes;
};

/**
 * Checks if a player's tetromino collides with the stage boundaries or merged blocks.
 * @param {Player} player The current player state (tetromino, position).
 * @param {Board} stage The current game board.
 * @param {{x: number, y: number}} param2 The movement offset.
 * @param {boolean} [flippedGravity=false] If true, collision logic adapted for flipped gravity.
 * @returns {boolean} True if a collision is detected, false otherwise.
 */
export const checkCollision = (
  player: Player,
  stage: Board,
  { x: moveX, y: moveY }: { x: number; y: number },
  flippedGravity: boolean = false
): boolean => {
  for (let y = 0; y < player.tetromino.shape.length; y += 1) {
    for (let x = 0; x < player.tetromino.shape[y].length; x += 1) {
      // Only check if it's an actual block within the tetromino's shape
      if (player.tetromino.shape[y][x] !== 0) {
        // Calculate the absolute next position of this specific block on the stage
        const nextBlockY = player.pos.y + y + moveY;
        const nextBlockX = player.pos.x + x + moveX;

        // 1. Check for collision with horizontal stage boundaries (walls)
        if (nextBlockX < 0 || nextBlockX >= STAGE_WIDTH) {
            return true; // Collision with a side wall
        }

        // 2. Check for collision with vertical stage boundaries (ground/ceiling)
        if (flippedGravity) {
            // For flipped gravity, the "ground" is at Y=0 (top of stage)
            if (nextBlockY < 0) return true; // Collision with "ground"
        } else {
            // For normal gravity, the "ground" is at Y=STAGE_HEIGHT (bottom of stage)
            if (nextBlockY >= STAGE_HEIGHT) return true; // Collision with "ground"
        }

        // 3. Check for collision with already merged blocks on the stage
        // This check is CRITICAL and must only be performed if nextBlockY is within valid array access range.
        if (nextBlockY >= 0 && nextBlockY < STAGE_HEIGHT) {
            if (stage[nextBlockY][nextBlockX][1] !== 'clear') {
                return true; // Collision with a merged block
            }
        }
        // No collision if nextBlockY is outside the visible stage but not yet at ground/ceiling (e.g. piece is above spawn area)
      }
    }
  }
  return false; // No collision detected
};

/**
 * Rotates a 2D matrix (tetromino shape) 90 degrees clockwise or counter-clockwise.
 * @param {TetrominoShape} matrix The tetromino shape matrix.
 * @param {number} dir Direction of rotation (1 for CW, -1 for CCW).
 * @returns {TetrominoShape} The rotated matrix.
 */
export const rotateMatrix = (matrix: TetrominoShape, dir: number): TetrominoShape => {
  // Transpose the matrix (rows become columns)
  const rotatedGrid = matrix.map((_, index) => matrix.map((col) => col[index]));
  // Reverse each row for clockwise rotation, or reverse all rows for counter-clockwise
  if (dir > 0) return rotatedGrid.map((row) => row.reverse());
  return rotatedGrid.reverse();
};

// Lookup key format: "CurrentState->NextState"
const KICK_TRANSITIONS: Record<string, { index: number; modifier: number }> = {
  '0->1': { index: 0, modifier: 1 },
  '1->0': { index: 0, modifier: -1 },
  '1->2': { index: 1, modifier: 1 },
  '2->1': { index: 1, modifier: -1 },
  '2->3': { index: 2, modifier: 1 },
  '3->2': { index: 2, modifier: -1 },
  '3->0': { index: 3, modifier: 1 },
  '0->3': { index: 3, modifier: -1 },
};

/**
 * Retrieves wall kick data for a given tetromino type, rotation state, and direction.
 * @param {TetrominoType} type The type of tetromino ('I' or 'JLSTZ').
 * @param {number} rotationState The current rotation state (0-3).
 * @param {number} direction The direction of rotation (1 for CW, -1 for CCW).
 * @returns {number[][]} An array of [x, y] offsets for wall kicks.
 */
export const getWallKicks = (type: TetrominoType, rotationState: number, direction: number): number[][] => {
    let nextState = (rotationState + direction) % 4;
    if (nextState < 0) nextState += 4;

    const transitionKey = `${rotationState}->${nextState}`;
    const transition = KICK_TRANSITIONS[transitionKey];

    if (!transition) return [[0, 0]]; // Should not happen with valid transitions

    const kickKey = type === 'I' ? 'I' : 'JLSTZ';
    const kickData = KICKS[kickKey][transition.index];

    // Apply modifier (inverse kick for reverse rotations)
    return kickData.map(k => [k[0] * transition.modifier, k[1] * transition.modifier]);
};

/**
 * Detects if a T-Spin has occurred based on the 3-corner rule.
 * Requires the T-piece to be in a specific orientation (flat base) and 3 of its 4 surrounding corners to be occupied.
 * @param {Player} player The player state after rotation, before locking.
 * @param {Board} stage The current game board.
 * @param {number} rotationState The current rotation state (0-3).
 * @returns {boolean} True if a T-Spin is detected, false otherwise.
 */
export const isTSpin = (player: Player, stage: Board, rotationState: number): boolean => {
    if (player.tetromino.type !== 'T') return false;

    const { x, y } = player.pos;

    // Define the 4 corner-check cells relative to the T-piece's 3x3 bounding box.
    // These are the corners of the 3x3 box containing the T-piece, regardless of its rotation.
    const cornerCheckPositions: Position[] = [
        { x: x, y: y },         // Top-left
        { x: x + 2, y: y },     // Top-right
        { x: x, y: y + 2 },     // Bottom-left
        { x: x + 2, y: y + 2 }  // Bottom-right
    ];

    let occupiedCorners = 0;

    for (const c of cornerCheckPositions) {
        // A "corner" is considered occupied if it's out of bounds (wall/floor)
        // or if the corresponding cell on the stage is not 'clear'.
        if (c.x < 0 || c.x >= STAGE_WIDTH || c.y >= STAGE_HEIGHT) {
            occupiedCorners++;
        } else if (c.y < 0) {
            // Cells above the visible stage (y < 0) don't count as occupied for the 3-corner rule.
            // This prevents false positives when a T-piece is high up.
            continue;
        } else if (c.y >= 0 && c.y < STAGE_HEIGHT && c.x >= 0 && c.x < STAGE_WIDTH && stage[c.y]?.[c.x]?.[1] !== 'clear') {
            occupiedCorners++;
        }
    }
    
    // The T-spin rule states that 3 out of these 4 corner cells must be occupied.
    // The `lastMoveWasRotation` flag in GameCore ensures it was a 'spin' into place.
    return occupiedCorners >= 3;
};
