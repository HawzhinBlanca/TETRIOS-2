
import { rotateMatrix, checkCollision } from './gameUtils';
import { STAGE_WIDTH, STAGE_HEIGHT, TETROMINOS, KICKS } from '../constants';

/**
 * The core logic for the AI bot, running within a Web Worker.
 * This function is stringified and executed as a Blob URL.
 * We inject dependencies via string interpolation to avoid duplication.
 */
const workerScript = `
  const STAGE_WIDTH = ${STAGE_WIDTH};
  const STAGE_HEIGHT = ${STAGE_HEIGHT};
  const TETROMINOS = ${JSON.stringify(TETROMINOS)};
  const KICKS = ${JSON.stringify(KICKS)};

  const WEIGHTS = {
    landingHeight: -5.0,
    rowsCleared: 10.0,
    rowTransitions: -4.0,
    colTransitions: -12.0,
    holes: -18.0,
    wellSums: -5.0,
  };

  // Injected helper functions from gameUtils.ts
  const rotateMatrix = ${rotateMatrix.toString()};
  const checkCollision = ${checkCollision.toString()};

  function cloneBoard(board) {
    return board.map(row => row.map(cell => [...cell]));
  }

  function lockPiece(board, shape, x, y, flippedGravity) {
    let dy = y;
    const moveIncrement = flippedGravity ? -1 : 1;
    
    // Construct a dummy player object for checkCollision
    const dummyPlayer = { pos: { x, y: dy }, tetromino: { shape } };

    // Find drop position
    while (!checkCollision(dummyPlayer, board, {x: 0, y: moveIncrement}, flippedGravity)) {
        dy += moveIncrement;
        dummyPlayer.pos.y = dy; // Update dummy player pos for next check
    }
    
    // Lock
    for(let r=0; r<shape.length; r++) {
        for(let c=0; c<shape[r].length; c++) {
            if(shape[r][c] !== 0) {
                const ny = dy + r;
                const nx = x + c;
                if(ny >= 0 && ny < STAGE_HEIGHT && nx >= 0 && nx < STAGE_WIDTH) {
                   board[ny][nx] = ['G', 'merged']; 
                }
            }
        }
    }
    return { board, droppedY: dy };
  }

  function evaluateBoard(board, droppedY, shapeHeight, flippedGravity) {
    let landingHeight;
    if (flippedGravity) {
        landingHeight = droppedY + (shapeHeight / 2); 
    } else {
        landingHeight = STAGE_HEIGHT - droppedY - (shapeHeight / 2);
    }
    
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
      const yStart = flippedGravity ? STAGE_HEIGHT - 1 : 0;
      const yEnd = flippedGravity ? -1 : STAGE_HEIGHT;
      const yIncrement = flippedGravity ? -1 : 1;

      for(let y=yStart; y !== yEnd; y += yIncrement) {
        const isFilled = board[y][x][1] !== 'clear';
        
        if(y >= 0 && y < STAGE_HEIGHT - 1) { 
          const nextY = y + (flippedGravity ? -1 : 1);
          if(nextY >= 0 && nextY < STAGE_HEIGHT) {
            if(isFilled !== (board[nextY][x][1] !== 'clear')) colTransitions++;
          }
        } else if (y === STAGE_HEIGHT -1 && !flippedGravity){ 
            if(isFilled) colTransitions++;
        } else if (y === 0 && flippedGravity){ 
            if(isFilled) colTransitions++;
        }

        if(isFilled) {
            colHasBlock = true;
        } else if(colHasBlock) {
            holes++; 
        }

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

  self.onmessage = function(e) {
    const { stage, type, rotationState, flippedGravity } = e.data;
    if (!TETROMINOS[type]) {
      self.postMessage(null); 
      return;
    }

    let bestScore = -Infinity;
    let bestMove = null;
    const baseShape = TETROMINOS[type].shape;
    const shapeHeight = baseShape.length;

    for(let r=0; r<4; r++) { 
      let shape = baseShape;
      for(let i=0; i<r; i++) shape = rotateMatrix(shape, 1);

      for(let x=-2; x<STAGE_WIDTH; x++) { 
        let validX = true;
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

        const simBoard = cloneBoard(stage);
        const startY = flippedGravity ? STAGE_HEIGHT - shape.length : 0;
        
        const dummyPlayer = { pos: { x, y: startY }, tetromino: { shape } };

        if (checkCollision(dummyPlayer, simBoard, {x:0, y:0}, flippedGravity)) {
            continue;
        }

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
`;

export const createAiWorker = (): Worker => {
  const blob = new Blob([workerScript], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};
