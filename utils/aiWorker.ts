
import { STAGE_WIDTH, STAGE_HEIGHT, TETROMINOS, KICKS } from '../constants';

/**
 * The core logic for the AI bot, running within a Web Worker.
 * This function is stringified and executed as a Blob URL.
 * 
 * CRITICAL: We inline helper functions (rotateMatrix, checkCollision) directly 
 * into the string to avoid dependency injection issues where imported functions
 * might rely on other modules that are not available in the worker's scope.
 */
const workerScript = `
  const STAGE_WIDTH = ${STAGE_WIDTH};
  const STAGE_HEIGHT = ${STAGE_HEIGHT};
  const TETROMINOS = ${JSON.stringify(TETROMINOS)};
  const KICKS = ${JSON.stringify(KICKS)};

  const WEIGHTS = {
    landingHeight: -10.0,
    rowsCleared: 30.0,
    rowTransitions: -6.0,
    colTransitions: -15.0,
    holes: -60.0, // Heavily penalized to prevent burials
    wellSums: -10.0,
    tSpin: 150.0, // Strong bias for T-Spins
  };

  // --- Inlined Geometry Helpers ---

  function rotateMatrix(matrix, dir) {
    const rotatedGrid = matrix.map((_, index) => matrix.map((col) => col[index]));
    if (dir > 0) return rotatedGrid.map((row) => row.reverse());
    return rotatedGrid.reverse();
  }

  function checkCollision(player, stage, { x: moveX, y: moveY }, flippedGravity) {
    for (let y = 0; y < player.tetromino.shape.length; y += 1) {
        for (let x = 0; x < player.tetromino.shape[y].length; x += 1) {
            if (player.tetromino.shape[y][x] !== 0) {
                const nextBlockY = player.pos.y + y + moveY;
                const nextBlockX = player.pos.x + x + moveX;

                if (nextBlockX < 0 || nextBlockX >= STAGE_WIDTH) {
                    return true;
                }

                if (flippedGravity) {
                    if (nextBlockY < 0) return true;
                } else {
                    if (nextBlockY >= STAGE_HEIGHT) return true;
                }

                if (nextBlockY >= 0 && nextBlockY < STAGE_HEIGHT) {
                    if (stage[nextBlockY][nextBlockX][1] !== 'clear') {
                        return true;
                    }
                }
            }
        }
    }
    return false;
  }

  function isTSpin(x, y, type, stage, flippedGravity) {
    if (type !== 'T') return false;
    
    const corners = [
        {x: x, y: y},
        {x: x+2, y: y},
        {x: x, y: y+2},
        {x: x+2, y: y+2}
    ];
    
    let occupied = 0;
    for (let i = 0; i < corners.length; i++) {
        const cx = corners[i].x;
        const cy = corners[i].y;
        
        // Side walls are always occupied
        if (cx < 0 || cx >= STAGE_WIDTH) {
            occupied++;
            continue;
        }

        if (flippedGravity) {
            // Falling UP. Y=0 is top(ground). Y=20 is bottom(sky).
            // If cy < 0, it's in the ground (occupied).
            if (cy < 0) {
                occupied++;
                continue;
            }
            // If cy >= STAGE_HEIGHT, it's in the sky (open/not occupied).
            if (cy >= STAGE_HEIGHT) {
                continue; 
            }
        } else {
            // Falling DOWN. Y=20 is bottom(ground). Y=-1 is top(sky).
            // If cy >= STAGE_HEIGHT, it's in the ground (occupied).
            if (cy >= STAGE_HEIGHT) {
                occupied++;
                continue;
            }
            // If cy < 0, it's in the sky (open).
            if (cy < 0) {
                continue;
            }
        }

        // Check board blocks
        if (stage[cy][cx][1] !== 'clear') {
            occupied++;
        }
    }
    return occupied >= 3;
  }

  // --- Core AI Logic ---

  function cloneBoard(board) {
    return board.map(row => row.map(cell => [...cell]));
  }

  function lockPiece(board, shape, x, y, flippedGravity) {
    let dy = y;
    const moveIncrement = flippedGravity ? -1 : 1;
    
    const dummyPlayer = { pos: { x, y: dy }, tetromino: { shape } };

    while (!checkCollision(dummyPlayer, board, {x: 0, y: moveIncrement}, flippedGravity)) {
        dy += moveIncrement;
        dummyPlayer.pos.y = dy; 
    }
    
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

  function evaluateBoard(board, droppedY, shapeHeight, flippedGravity, isTSpinMove) {
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

    let score = (
      landingHeight * WEIGHTS.landingHeight +
      rowsCleared * WEIGHTS.rowsCleared +
      rowTransitions * WEIGHTS.rowTransitions +
      colTransitions * WEIGHTS.colTransitions +
      holes * WEIGHTS.holes +
      wellSums * WEIGHTS.wellSums
    );

    if (isTSpinMove) {
        score += WEIGHTS.tSpin;
    }

    return score;
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
        
        // Check for T-Spin at final position
        const isTSpinMove = isTSpin(x, droppedY, type, stage, flippedGravity);
        
        const score = evaluateBoard(finalBoard, droppedY, shape.length, flippedGravity, isTSpinMove);

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
