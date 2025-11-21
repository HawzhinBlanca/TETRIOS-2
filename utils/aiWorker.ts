
import { Board, TetrominoType, MoveScore, TetrominoShape, CellData, CellState, Position } from '../types';

/**
 * The core logic for the AI bot, running within a Web Worker.
 * This function is stringified and executed as a Blob URL to avoid module import issues in workers without a build system.
 * NOTE: Due to the constraints of a Blob Worker without a build system,
 * necessary types and utility functions are duplicated here.
 * In a production environment with a bundler (e.g., Webpack, Vite),
 * these would be imported directly from shared utility files.
 */
const workerFunction = () => {
  const STAGE_WIDTH: number = 10;
  const STAGE_HEIGHT: number = 20;

  // Type definitions duplicated for worker scope
  type InternalTetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z' | 'G';
  type InternalTetrominoShape = (InternalTetrominoType | 0)[][];
  type InternalCellState = 'clear' | 'merged';
  // Updated InternalCellData to include CellModifier (treated as opaque by AI)
  type InternalCellModifier = { type: 'GEM' | 'BOMB' | 'ICE' | 'CRACKED_ICE'; timer?: number; hits?: number; };
  type InternalCellData = [InternalTetrominoType | null, InternalCellState, InternalCellModifier?];
  type InternalBoard = InternalCellData[][];
  type InternalMoveScore = { r: number; x: number; y?: number; score: number; };
  type InternalPosition = { x: number; y: number };
  
  // Redefined TETROMINOS for worker scope (simplified, only shapes needed)
  const TETROMINOS: Record<InternalTetrominoType, { shape: InternalTetrominoShape }> = {
    I: { shape: [[0, 'I', 0, 0], [0, 'I', 0, 0], [0, 'I', 0, 0], [0, 'I', 0, 0]] },
    J: { shape: [[0, 'J', 0], [0, 'J', 0], ['J', 'J', 0]] },
    L: { shape: [[0, 'L', 0], [0, 'L', 0], [0, 'L', 'L']] },
    O: { shape: [['O', 'O'], ['O', 'O']] },
    S: { shape: [[0, 'S', 'S'], ['S', 'S', 0], [0, 0, 0]] },
    T: { shape: [[0, 0, 0], ['T', 'T', 'T'], [0, 'T', 0]] },
    Z: { shape: [['Z', 'Z', 0], [0, 'Z', 'Z'], [0, 0, 0]] },
    G: { shape: [['G']] } // Dummy for garbage
  };

  const WEIGHTS = {
    landingHeight: -5.0,
    rowsCleared: 10.0,
    rowTransitions: -4.0,
    colTransitions: -12.0,
    holes: -18.0,
    wellSums: -5.0,
  };
  
  /**
   * Rotates a 2D matrix (tetromino shape) 90 degrees clockwise or counter-clockwise.
   * @param {InternalTetrominoShape} matrix The tetromino shape matrix.
   * @param {number} dir Direction of rotation (1 for CW, -1 for CCW).
   * @returns {InternalTetrominoShape} The rotated matrix.
   */
  function rotateMatrix(matrix: InternalTetrominoShape, dir: number): InternalTetrominoShape {
    const rotatedGrid: InternalTetrominoShape = matrix.map((_, index) => matrix.map((col) => col[index]));
    if (dir > 0) return rotatedGrid.map((row) => row.reverse()) as InternalTetrominoShape;
    return rotatedGrid.reverse() as InternalTetrominoShape;
  }

  /**
   * Creates a deep clone of the game board.
   * @param {InternalBoard} board The board to clone.
   * @returns {InternalBoard} A new, independent copy of the board.
   */
  function cloneBoard(board: InternalBoard): InternalBoard {
    return board.map(row => row.map(cell => [...cell]));
  }

  /**
   * Checks if a tetromino collides with the stage boundaries or merged blocks.
   * Duplicated from gameUtils.ts to avoid worker import issues.
   * @param {InternalPosition} playerPos The current position of the tetromino.
   * @param {InternalTetrominoShape} shape The shape of the tetromino.
   * @param {InternalBoard} stage The current game board.
   * @param {{x: number, y: number}} param2 The movement offset.
   * @param {boolean} [flippedGravity=false] If true, collision logic adapted for flipped gravity.
   * @returns {boolean} True if a collision is detected, false otherwise.
   */
  function checkCollisionWorker(
    playerPos: InternalPosition,
    shape: InternalTetrominoShape,
    stage: InternalBoard,
    { x: moveX, y: moveY }: { x: number; y: number },
    flippedGravity: boolean = false
  ): boolean {
    for (let y = 0; y < shape.length; y += 1) {
      for (let x = 0; x < shape[y].length; x += 1) {
        // Only check if it's an actual block within the tetromino's shape
        if (shape[y][x] !== 0) {
          // Calculate the absolute next position of this specific block on the stage
          const nextBlockY = playerPos.y + y + moveY;
          const nextBlockX = playerPos.x + x + moveX;

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
        }
      }
    }
    return false; // No collision detected
  }


  /**
   * Simulates locking a tetromino onto a board, finding its drop position.
   * For AI purposes, locked pieces are marked as generic 'G' (garbage/merged).
   * @param {InternalBoard} board The board to simulate on.
   * @param {InternalTetrominoShape} shape The shape of the tetromino.
   * @param {number} x The initial X position.
   * @param {number} y The initial Y position.
   * @param {boolean} [flippedGravity=false] If true, piece drops upwards.
   * @returns {{board: InternalBoard, droppedY: number}} The modified board and the final dropped Y position.
   */
  function lockPiece(board: InternalBoard, shape: InternalTetrominoShape, x: number, y: number, flippedGravity: boolean = false): { board: InternalBoard, droppedY: number } {
    let dy: number = y;
    const moveIncrement = flippedGravity ? -1 : 1;
    
    // Find the lowest/highest possible Y position without collision
    // Use the worker's checkCollisionWorker function
    while (!checkCollisionWorker({x, y: dy}, shape, board, {x: 0, y: moveIncrement}, flippedGravity)) {
        dy += moveIncrement;
    }
    // dy is now the first colliding position. We need to roll it back one step to the last non-colliding position.
    // However, the `checkCollisionWorker` already checks one step ahead. So if it returns false, we move.
    // If it returns true, `dy` is the position *before* the collision. No rollback needed here.
    // The original `lockPiece` logic for rollback was likely for a different collision checking style.
    // Keeping this simple `while` loop with `checkCollisionWorker` makes it consistent with GameCore.

    // Lock the piece at the final dy
    for(let r=0; r<shape.length; r++) {
        for(let c=0; c<shape[r].length; c++) {
            if(shape[r][c] !== 0) {
                const ny: number = dy + r;
                const nx: number = x + c;
                if(ny >= 0 && ny < STAGE_HEIGHT && nx >= 0 && nx < STAGE_WIDTH) {
                   board[ny][nx] = ['G', 'merged']; // Mark as merged garbage
                }
            }
        }
    }
    return { board, droppedY: dy };
  }

  /**
   * Evaluates the given board state based on a set of weighted heuristics.
   * @param {InternalBoard} board The board state to evaluate.
   * @param {number} droppedY The Y position where the piece was dropped.
   * @param {number} shapeHeight The height of the tetromino that was dropped.
   * @param {boolean} [flippedGravity=false] If true, board evaluation adapted for flipped gravity.
   * @returns {number} The calculated score for the board state.
   */
  function evaluateBoard(board: InternalBoard, droppedY: number, shapeHeight: number, flippedGravity: boolean = false): number {
    let landingHeight: number;
    if (flippedGravity) {
        landingHeight = droppedY + (shapeHeight / 2); // Closer to top (lower Y) is better
    } else {
        landingHeight = STAGE_HEIGHT - droppedY - (shapeHeight / 2); // Closer to bottom (higher Y) is better
    }
    
    let rowsCleared: number = 0;
    let rowTransitions: number = 0;
    let colTransitions: number = 0;
    let holes: number = 0;
    let wellSums: number = 0;

    for(let y=0; y<STAGE_HEIGHT; y++) {
      if(board[y].every((cell: InternalCellData) => cell[1] !== 'clear')) rowsCleared++;
    }

    for(let y=0; y<STAGE_HEIGHT; y++) {
      for(let x=0; x<STAGE_WIDTH-1; x++) {
        if( (board[y][x][1] !== 'clear') !== (board[y][x+1][1] !== 'clear') ) rowTransitions++;
      }
      if(board[y][0][1] === 'clear') rowTransitions++;
      if(board[y][STAGE_WIDTH-1][1] === 'clear') rowTransitions++;
    }

    for(let x=0; x<STAGE_WIDTH; x++) {
      let colHasBlock: boolean = false;
      // Determine iteration direction for holes based on gravity
      const yStart = flippedGravity ? STAGE_HEIGHT - 1 : 0;
      const yEnd = flippedGravity ? -1 : STAGE_HEIGHT; // Loop while y > -1 or y < STAGE_HEIGHT
      const yIncrement = flippedGravity ? -1 : 1;

      for(let y=yStart; y !== yEnd; y += yIncrement) {
        const isFilled: boolean = board[y][x][1] !== 'clear';
        
        // Column transitions
        if(y >= 0 && y < STAGE_HEIGHT - 1) { // Ensure current and next Y are valid
          const nextY = y + (flippedGravity ? -1 : 1);
          if(nextY >= 0 && nextY < STAGE_HEIGHT) {
            if(isFilled !== (board[nextY][x][1] !== 'clear')) colTransitions++;
          }
        } else if (y === STAGE_HEIGHT -1 && !flippedGravity){ // Boundary transition to floor for normal gravity
            if(isFilled) colTransitions++;
        } else if (y === 0 && flippedGravity){ // Boundary transition to ceiling for flipped gravity
            if(isFilled) colTransitions++;
        }


        // Holes
        if(isFilled) {
            colHasBlock = true;
        } else if(colHasBlock) {
            holes++; // A hole is an empty space with a block "above" it (relative to gravity)
        }

        // Well sums (empty column in between two filled columns)
        if(x>0 && x<STAGE_WIDTH-1) {
          if(!isFilled && board[y][x-1][1] !== 'clear' && board[y][x+1][1] !== 'clear') wellSums++;
        }
      }
    }

    return (
      landingHeight * WEIGHTS.landingHeight +
      rowsCleared * WEIGHTS.rowsCleared +
      rowTransitions * WEIGHTS.rowTransitions +
      colTransitions * WEIGHTS.colTransitions +
      holes * WEIGHTS.holes +
      wellSums * WEIGHTS.wellSums
    );
  }

  /**
   * Web Worker message handler. Receives stage and tetromino type,
   * calculates the best move, and posts it back to the main thread.
   * @param {MessageEvent<{ stage: InternalBoard, type: InternalTetrominoType, rotationState: number, flippedGravity: boolean }>} e Message event containing game state.
   */
  self.onmessage = function(e: MessageEvent<{ stage: InternalBoard, type: InternalTetrominoType, rotationState: number, flippedGravity: boolean }>) {
    const { stage, type, rotationState, flippedGravity } = e.data;
    if (!TETROMINOS[type]) {
      self.postMessage(null); // Invalid tetromino type
      return;
    }

    let bestScore: number = -Infinity;
    let bestMove: InternalMoveScore | null = null;
    const baseShape: InternalTetrominoShape = TETROMINOS[type].shape;
    const shapeHeight = baseShape.length;

    for(let r=0; r<4; r++) { // Iterate through all possible rotations
      let shape: InternalTetrominoShape = baseShape;
      for(let i=0; i<r; i++) shape = rotateMatrix(shape, 1);

      for(let x=-2; x<STAGE_WIDTH; x++) { // Iterate through all possible X positions
        let validX: boolean = true;
        for(let row=0; row<shape.length; row++) {
           for(let col=0; col<shape[row].length; col++) {
               if(shape[row][col] !== 0) {
                   if(x+col < 0 || x+col >= STAGE_WIDTH) {
                       validX = false;
                       break;
                   }
               }
           }
           if(!validX) break;
        }
        if(!validX) continue;

        const simBoard: InternalBoard = cloneBoard(stage);
        let canFit: boolean = true;
        // Check if the piece can fit horizontally at the start Y position (top for normal, bottom for flipped)
        const startY = flippedGravity ? STAGE_HEIGHT - shape.length : 0;
        
        // Use checkCollisionWorker to check if piece collides at startY
        if (checkCollisionWorker({x, y: startY}, shape, simBoard, {x:0, y:0}, flippedGravity)) {
            canFit = false;
        }

        if(!canFit) continue;

        const { board: finalBoard, droppedY } = lockPiece(simBoard, shape, x, startY, flippedGravity);
        const score = evaluateBoard(finalBoard, droppedY, shape.length, flippedGravity);

        if(score > bestScore) {
           bestScore = score;
           bestMove = { x, r, score, y: droppedY };
        }
      }
    }

    self.postMessage(bestMove);
  };
};

/**
 * Builds the worker script by stringifying the workerFunction.
 * @returns {string} The JavaScript code for the worker.
 */
const buildWorkerScript = (): string => {
  const code = `(${workerFunction.toString()})()`;
  return code;
};

/**
 * Creates and returns a new Web Worker instance for the AI.
 * @returns {Worker} A new Web Worker.
 */
export const createAiWorker = (): Worker => {
  const script = buildWorkerScript();
  const blob = new Blob([script], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};
