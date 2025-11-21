import { Board, TetrominoShape, TetrominoType, MoveScore, CellData, Position } from '../types';
import { STAGE_HEIGHT, STAGE_WIDTH, TETROMINOS } from '../constants';
import { rotateMatrix, isTSpin as checkGameTSpin } from './gameUtils'; // Renamed isTSpin to checkGameTSpin to avoid conflict

const WEIGHTS = {
  landingHeight: -5.0,
  rowsCleared: 10.0,
  rowTransitions: -4.0,
  colTransitions: -12.0,
  holes: -18.0,
  wellSums: -5.0,
};

/**
 * Creates a deep clone of the game board.
 * @param {Board} board The board to clone.
 * @returns {Board} A new, independent copy of the board.
 */
const cloneBoard = (board: Board): Board => board.map(row => row.map(cell => [...cell]));

/**
 * Simulates locking a tetromino onto a board, finding its drop position.
 * For AI purposes, locked pieces are marked as generic 'G' (garbage/merged).
 * @param {Board} board The board to simulate on.
 * @param {TetrominoShape} shape The shape of the tetromino.
 * @param {number} x The initial X position.
 * @param {number} y The initial Y position.
 * @returns {{board: Board, droppedY: number}} The modified board and the final dropped Y position.
 */
const lockPiece = (board: Board, shape: TetrominoShape, x: number, y: number): { board: Board, droppedY: number } => {
  let dy: number = y;
  // Find the lowest possible Y position
  while (dy < STAGE_HEIGHT) {
     let collision: boolean = false;
     for(let r=0; r<shape.length; r++) {
         for(let c=0; c<shape[r].length; c++) {
             if(shape[r][c] !== 0) {
                 const ny: number = dy + r + 1; // Check one row below current
                 const nx: number = x + c;
                 if(ny >= STAGE_HEIGHT || (ny >= 0 && nx >= 0 && nx < STAGE_WIDTH && board[ny][nx][1] !== 'clear')) {
                     collision = true;
                     break;
                 }
             }
         }
         if (collision) break;
     }
     if(collision) break;
     dy++;
  }

  // Lock the piece at dy
  for(let r=0; r<shape.length; r++) {
      for(let c=0; c<shape[r].length; c++) {
          if(shape[r][c] !== 0) {
              const ny: number = dy + r;
              const nx: number = x + c;
              if(ny >= 0 && ny < STAGE_HEIGHT && nx >= 0 && nx < STAGE_WIDTH) {
                 board[ny][nx] = ['G', 'merged']; // Mark as merged garbage for AI
              }
          }
      }
  }
  return { board, droppedY: dy };
};

/**
 * Evaluates the given board state based on a set of weighted heuristics.
 * @param {Board} board The board state to evaluate.
 * @param {number} droppedY The Y position where the piece was dropped.
 * @param {number} shapeHeight The height of the tetromino that was dropped.
 * @returns {number} The calculated score for the board state.
 */
const evaluateBoard = (board: Board, droppedY: number, shapeHeight: number): number => {
    // Heuristics (from a common Tetris AI paper by David Clark)
    let landingHeight: number = STAGE_HEIGHT - droppedY - (shapeHeight / 2);
    let rowsCleared: number = 0;
    let rowTransitions: number = 0;
    let colTransitions: number = 0;
    let holes: number = 0;
    let wellSums: number = 0;

    // Calculate rows cleared
    for(let y=0; y<STAGE_HEIGHT; y++) {
        if(board[y].every(cell => cell[1] !== 'clear')) rowsCleared++;
    }

    // Calculate row transitions
    for(let y=0; y<STAGE_HEIGHT; y++) {
        for(let x=0; x<STAGE_WIDTH-1; x++) {
            if( (board[y][x][1] !== 'clear') !== (board[y][x+1][1] !== 'clear') ) rowTransitions++;
        }
        // Account for transitions to walls
        if(board[y][0][1] === 'clear') rowTransitions++;
        if(board[y][STAGE_WIDTH-1][1] === 'clear') rowTransitions++;
    }

    // Calculate column transitions, holes, and well sums
    for(let x=0; x<STAGE_WIDTH; x++) {
        let colHasBlock: boolean = false;
        for(let y=0; y<STAGE_HEIGHT; y++) {
            const isFilled: boolean = board[y][x][1] !== 'clear';
            
            // Column transitions
            if(y < STAGE_HEIGHT-1) {
                 if(isFilled !== (board[y+1][x][1] !== 'clear')) colTransitions++;
            }
            
            // Holes
            if(isFilled) colHasBlock = true;
            else if(colHasBlock) holes++; // A hole is an empty space with a block above it

            // Well sums (empty column in between two filled columns)
            if(x>0 && x<STAGE_WIDTH-1) {
                if(!isFilled && board[y][x-1][1] !== 'clear' && board[y][x+1][1] !== 'clear') wellSums++;
            }
        }
    }

    // Apply weights
    return (
        landingHeight * WEIGHTS.landingHeight +
        rowsCleared * WEIGHTS.rowsCleared +
        rowTransitions * WEIGHTS.rowTransitions +
        colTransitions * WEIGHTS.colTransitions +
        holes * WEIGHTS.holes +
        wellSums * WEIGHTS.wellSums
    );
};

/**
 * Determines the best possible move for a given tetromino on the current stage using a heuristic search.
 * @param {Board} stage The current game board.
 * @param {TetrominoType} type The type of the tetromino to place.
 * @returns {MoveScore | null} The best move found (rotation, x-position, score, and final y), or null if no valid moves.
 */
export const getBestMove = (stage: Board, type: TetrominoType): MoveScore | null => {
    let bestScore: number = -Infinity;
    let bestMove: MoveScore | null = null;

    const tetrominoData = TETROMINOS[type];
    if (!tetrominoData) return null; // Should not happen with valid types

    const baseShape: TetrominoShape = tetrominoData.shape;

    // Iterate through all possible rotations (0 to 3)
    for(let r=0; r<4; r++) {
        let shape: TetrominoShape = baseShape;
        for(let i=0; i<r; i++) shape = rotateMatrix(shape, 1); // Rotate to desired state

        // Iterate through all possible X positions
        // -2 to account for pieces starting partially off-stage to the left
        for(let x=-2; x<STAGE_WIDTH; x++) {
            // Check if the initial X position is valid for the current shape
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

            const simBoard: Board = cloneBoard(stage);
            
            // Check if the piece can fit horizontally at the top (y=0) at this x position
            let canFit: boolean = true;
             for(let row=0; row<shape.length; row++) {
               for(let col=0; col<shape[row].length; col++) {
                   if(shape[row][col] !== 0) {
                       const boardY: number = row; // At y=0
                       const boardX: number = x + col;
                       if (boardY >= 0 && boardY < STAGE_HEIGHT && boardX >= 0 && boardX < STAGE_WIDTH) {
                         if(simBoard[boardY][boardX][1] !== 'clear') {
                            canFit = false;
                            break;
                         }
                       }
                   }
               }
               if(!canFit) break;
            }
            if(!canFit) continue;

            // Simulate dropping and locking the piece
            const { board: finalBoard, droppedY } = lockPiece(simBoard, shape, x, 0);
            const score = evaluateBoard(finalBoard, droppedY, shape.length);

            // Update best move if current score is better
            if(score > bestScore) {
                bestScore = score;
                bestMove = { x, r, score, y: droppedY }; // Store droppedY for ghost positioning
            }
        }
    }
    return bestMove;
};