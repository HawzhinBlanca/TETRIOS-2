
import { Board, TetrominoType, MoveScore } from '../types';

// We define the worker script as a string to avoid bundler issues with external worker files.
// This makes the app portable and robust.
const workerScript = `
  // --- CONSTANTS & TYPES (Inlined for Worker Isolation) ---
  const STAGE_WIDTH = 10;
  const STAGE_HEIGHT = 20;
  
  const TETROMINOS = {
    I: { shape: [[0, 'I', 0, 0], [0, 'I', 0, 0], [0, 'I', 0, 0], [0, 'I', 0, 0]] },
    J: { shape: [[0, 'J', 0], [0, 'J', 0], ['J', 'J', 0]] },
    L: { shape: [[0, 'L', 0], [0, 'L', 0], [0, 'L', 'L']] },
    O: { shape: [['O', 'O'], ['O', 'O']] },
    S: { shape: [[0, 'S', 'S'], ['S', 'S', 0], [0, 0, 0]] },
    T: { shape: [[0, 0, 0], ['T', 'T', 'T'], [0, 'T', 0]] },
    Z: { shape: [['Z', 'Z', 0], [0, 'Z', 'Z'], [0, 0, 0]] },
  };

  const WEIGHTS = {
    landingHeight: -4.50,
    rowsCleared: 3.41,
    rowTransitions: -3.21,
    colTransitions: -9.34,
    holes: -7.89,
    wellSums: -3.38,
  };

  // --- HELPER FUNCTIONS ---
  
  function rotateMatrix(matrix, dir) {
    const rotatedGrid = matrix.map((_, index) => matrix.map((col) => col[index]));
    if (dir > 0) return rotatedGrid.map((row) => row.reverse());
    return rotatedGrid.reverse();
  }

  function cloneBoard(board) {
    return board.map(row => row.map(cell => [...cell]));
  }

  function lockPiece(board, shape, x, y) {
    let dy = y;
    // Hard drop simulation
    while (dy < STAGE_HEIGHT) {
      let collision = false;
      for(let r=0; r<shape.length; r++) {
        for(let c=0; c<shape[r].length; c++) {
          if(shape[r][c] !== 0) {
            const ny = dy + r + 1;
            const nx = x + c;
            if(ny >= STAGE_HEIGHT || (ny >= 0 && board[ny][nx][1] !== 'clear')) {
              collision = true;
            }
          }
        }
      }
      if(collision) break;
      dy++;
    }

    // Place
    for(let r=0; r<shape.length; r++) {
      for(let c=0; c<shape[r].length; c++) {
        if(shape[r][c] !== 0) {
          const ny = dy + r;
          const nx = x + c;
          if(ny >= 0 && ny < STAGE_HEIGHT && nx >= 0 && nx < STAGE_WIDTH) {
            board[ny][nx] = [1, 'merged']; 
          }
        }
      }
    }
    return { board, droppedY: dy };
  }

  function evaluateBoard(board, droppedY, shapeHeight) {
    let landingHeight = STAGE_HEIGHT - droppedY - (shapeHeight / 2);
    let rowsCleared = 0;
    let rowTransitions = 0;
    let colTransitions = 0;
    let holes = 0;
    let wellSums = 0;

    for(let y=0; y<STAGE_HEIGHT; y++) {
      if(board[y].every(cell => cell[1] !== 'clear')) rowsCleared++;
    }

    for(let y=0; y<STAGE_HEIGHT; y++) {
      for(let x=0; x<STAGE_WIDTH-1; x++) {
        if( (board[y][x][1] !== 'clear') !== (board[y][x+1][1] !== 'clear') ) rowTransitions++;
      }
      if(board[y][0][1] === 'clear') rowTransitions++;
      if(board[y][STAGE_WIDTH-1][1] === 'clear') rowTransitions++;
    }

    for(let x=0; x<STAGE_WIDTH; x++) {
      let colHasBlock = false;
      for(let y=0; y<STAGE_HEIGHT; y++) {
        const isFilled = board[y][x][1] !== 'clear';
        
        if(y < STAGE_HEIGHT-1) {
          if(isFilled !== (board[y+1][x][1] !== 'clear')) colTransitions++;
        }
        
        if(isFilled) colHasBlock = true;
        else if(colHasBlock) holes++;

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

  // --- MAIN LISTENER ---
  self.onmessage = function(e) {
    const { stage, type } = e.data;
    if (!TETROMINOS[type]) return;

    let bestScore = -Infinity;
    let bestMove = null;
    const baseShape = TETROMINOS[type].shape;

    // 4 Rotations
    for(let r=0; r<4; r++) {
      let shape = baseShape;
      for(let i=0; i<r; i++) shape = rotateMatrix(shape, 1);

      // All columns
      for(let x=-2; x<STAGE_WIDTH; x++) {
        // Basic validity check
        let validX = true;
        for(let row=0; row<shape.length; row++) {
           for(let col=0; col<shape[row].length; col++) {
               if(shape[row][col] !== 0) {
                   if(x+col < 0 || x+col >= STAGE_WIDTH) validX = false;
               }
           }
        }
        if(!validX) continue;

        // Simulation
        const simBoard = cloneBoard(stage);
        // Simple collision check at top
        let canFit = true;
        for(let row=0; row<shape.length; row++) {
           for(let col=0; col<shape[row].length; col++) {
               if(shape[row][col] !== 0) {
                   if(simBoard[row][x+col] && simBoard[row][x+col][1] !== 'clear') canFit = false;
               }
           }
        }
        if(!canFit) continue;

        const { board: finalBoard, droppedY } = lockPiece(simBoard, shape, x, 0);
        const score = evaluateBoard(finalBoard, droppedY, shape.length);

        if(score > bestScore) {
           bestScore = score;
           bestMove = { x, r, score, y: droppedY };
        }
      }
    }

    self.postMessage(bestMove);
  };
`;

export const createAiWorker = () => {
  const blob = new Blob([workerScript], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};
