
import { WorkerRequest, WorkerResponse, WorkerInitPayload, Board, TetrominoType } from '../types';

// Pure logic function for AI scoring, safe for export/testing
export const workerLogic = () => {
    let CONSTANTS: any = null; // Use any to allow bracket access without TS complaining inside stringified function

    const _WEIGHTS = {
      landingHeight: -10.0,
      rowsCleared: 30.0,
      rowTransitions: -6.0,
      colTransitions: -15.0,
      holes: -60.0,
      wellSums: -10.0,
      tSpin: 150.0,
    };

    const rotateMatrix = (matrix: any[][], dir: number) => {
        const rotatedGrid = matrix.map((_, index) => matrix.map((col) => col[index]));
        if (dir > 0) return rotatedGrid.map((row) => row.reverse());
        return rotatedGrid.reverse();
    };

    const checkCollision = (player: any, stage: any, moveOffset: any, flippedGravity: boolean) => {
        const { x: moveX, y: moveY } = moveOffset;
        const { shape } = player.tetromino;
        const shapeH = shape.length;
        if (shapeH === 0) return false;
        
        const { x: posX, y: posY } = player.pos;
        const boardH = stage.length;
        const boardW = stage[0]?.length || 0;

        const targetStartX = posX + moveX;
        const targetStartY = posY + moveY;

        for (let y = 0; y < shapeH; y++) {
            const row = shape[y];
            const targetY = targetStartY + y;

            for (let x = 0; x < row.length; x++) {
                if (row[x] !== 0) {
                    const targetX = targetStartX + x;

                    if (targetX < 0 || targetX >= boardW) return true;

                    if (flippedGravity) {
                        if (targetY < 0) return true;
                    } else {
                        if (targetY >= boardH) return true;
                    }

                    if (targetY >= 0 && targetY < boardH) {
                        if (stage[targetY][targetX][1] !== 'clear') return true;
                    }
                }
            }
        }
        return false;
    };

    const isTSpin = (player: any, stage: any, rotationState: any, flippedGravity: boolean) => {
        if (player.tetromino.type !== 'T') return false;
        if (!CONSTANTS) return false;
        const { x, y } = player.pos;
        
        // Use bracket notation for constants to survive minification
        const width = CONSTANTS['STAGE_WIDTH'];
        const height = CONSTANTS['STAGE_HEIGHT'];
        
        const cornerCheckPositions = [
            { x: x, y: y },         
            { x: x + 2, y: y },     
            { x: x, y: y + 2 },     
            { x: x + 2, y: y + 2 }  
        ];

        let occupiedCorners = 0;

        for (const c of cornerCheckPositions) {
            if (c.x < 0 || c.x >= width) {
                occupiedCorners++;
                continue;
            }
            if (flippedGravity) {
                if (c.y < 0) { occupiedCorners++; continue; }
                if (c.y >= height) continue;
            } else {
                if (c.y >= height) { occupiedCorners++; continue; }
                if (c.y < 0) continue;
            }
            if (stage[c.y][c.x][1] !== 'clear') {
                occupiedCorners++;
            }
        }
        return occupiedCorners >= 3;
    };

    const cloneBoard = (board: any) => {
      return board.map((row: any) => row.map((cell: any) => [...cell]));
    };

    const lockPiece = (board: any, shape: any, x: number, y: number, flippedGravity: boolean) => {
      if (!CONSTANTS) return { board, droppedY: y };
      const height = CONSTANTS['STAGE_HEIGHT'];
      const width = CONSTANTS['STAGE_WIDTH'];
      
      let dy = y;
      const moveIncrement = flippedGravity ? -1 : 1;
      
      while (true) {
          const nextY = dy + moveIncrement;
          const playerMock = { pos: { x, y: nextY }, tetromino: { shape } };
          
          if (checkCollision(playerMock, board, {x:0, y:0}, flippedGravity)) {
              break;
          }
          dy = nextY;
      }
      
      for(let r=0; r<shape.length; r++) {
          for(let c=0; c<shape[r].length; c++) {
              if(shape[r][c] !== 0) {
                  const ny = dy + r;
                  const nx = x + c;
                  if(ny >= 0 && ny < height && nx >= 0 && nx < width) {
                     board[ny][nx] = ['G', 'merged']; 
                  }
              }
          }
      }
      return { board, droppedY: dy };
    };

    const evaluateBoard = (board: any, droppedY: number, shapeHeight: number, flippedGravity: boolean, isTSpinMove: boolean) => {
      if (!CONSTANTS) return -Infinity;
      
      const height = CONSTANTS['STAGE_HEIGHT'];
      const width = CONSTANTS['STAGE_WIDTH'];

      let landingHeight;
      if (flippedGravity) {
          landingHeight = droppedY + (shapeHeight / 2); 
      } else {
          landingHeight = height - droppedY - (shapeHeight / 2);
      }
      
      let rowsCleared = 0;
      let rowTransitions = 0;
      let colTransitions = 0;
      let holes = 0;
      let wellSums = 0;

      for(let y=0; y<height; y++) {
        if(board[y].every((cell: any) => cell[1] !== 'clear')) rowsCleared++;
      }

      for(let y=0; y<height; y++) {
        for(let x=0; x<width-1; x++) {
          if( (board[y][x][1] !== 'clear') !== (board[y][x+1][1] !== 'clear') ) rowTransitions++;
        }
        if(board[y][0][1] === 'clear') rowTransitions++;
        if(board[y][width-1][1] === 'clear') rowTransitions++;
      }

      for(let x=0; x<width; x++) {
        let colHasBlock = false;
        const yStart = flippedGravity ? height - 1 : 0;
        const yEnd = flippedGravity ? -1 : height;
        const yIncrement = flippedGravity ? -1 : 1;

        for(let y=yStart; y !== yEnd; y += yIncrement) {
          const isFilled = board[y][x][1] !== 'clear';
          
          if(y >= 0 && y < height - 1) { 
            const nextY = y + (flippedGravity ? -1 : 1);
            if(nextY >= 0 && nextY < height) {
              if(isFilled !== (board[nextY][x][1] !== 'clear')) colTransitions++;
            }
          } else if (y === height -1 && !flippedGravity){ 
              if(isFilled) colTransitions++;
          } else if (y === 0 && flippedGravity){ 
              if(isFilled) colTransitions++;
          }

          if(isFilled) {
              colHasBlock = true;
          } else if(colHasBlock) {
              holes++; 
          }

          if(x>0 && x<width-1) {
            if(!isFilled && board[y][x-1][1] !== 'clear' && board[y][x+1][1] !== 'clear') wellSums++;
          }
        }
      }

      let score = (
        landingHeight * _WEIGHTS.landingHeight +
        rowsCleared * _WEIGHTS.rowsCleared +
        rowTransitions * _WEIGHTS.rowTransitions +
        colTransitions * _WEIGHTS.colTransitions +
        holes * _WEIGHTS.holes +
        wellSums * _WEIGHTS.wellSums
      );

      if (isTSpinMove) {
          score += _WEIGHTS.tSpin;
      }

      return score;
    };

    // MAIN WORKER LOOP
    self.onmessage = function(e: MessageEvent<WorkerRequest>) {
      if (e.data.type === 'INIT' && e.data.payload) {
          CONSTANTS = e.data.payload;
          return;
      }

      if (!CONSTANTS) return; 

      try {
        const { stage, tetrominoType, flippedGravity, mode, playerMove, id } = e.data; 
        
        // Bracket access for safety
        const tetrominos = CONSTANTS['TETROMINOS'];
        const stageWidth = CONSTANTS['STAGE_WIDTH'];
        const stageHeight = CONSTANTS['STAGE_HEIGHT'];

        if (!tetrominoType || !tetrominos[tetrominoType]) {
          const response: WorkerResponse = { result: null, id };
          self.postMessage(response); 
          return;
        }

        let bestScore = -Infinity;
        let bestMove = null;
        const baseShape = tetrominos[tetrominoType].shape;

        // Iterate all possible moves
        for(let r=0; r<4; r++) { 
          let shape = baseShape;
          for(let i=0; i<r; i++) shape = rotateMatrix(shape, 1);

          for(let x=-2; x<stageWidth; x++) { 
            let validX = true;
            for(let row=0; row<shape.length; row++) {
              for(let col=0; col<shape[row].length; col++) {
                  if(shape[row][col] !== 0) {
                      if(x+col < 0 || x+col >= stageWidth) {
                          validX = false;
                          break;
                      }
                  }
              }
              if(!validX) break;
            }
            if(!validX) continue;

            const startY = flippedGravity ? stageHeight - shape.length : 0;
            const playerMock = { pos: { x, y: startY }, tetromino: { shape } };

            if (checkCollision(playerMock, stage, {x:0, y:0}, flippedGravity || false)) {
                continue;
            }

            const simBoard = cloneBoard(stage);
            const { board: finalBoard, droppedY } = lockPiece(simBoard, shape, x, startY, flippedGravity || false);
            
            const dropPlayer = { pos: { x, y: droppedY }, tetromino: { type: tetrominoType, shape } };
            const isTSpinMove = isTSpin(dropPlayer, stage, r, flippedGravity || false);
            
            const score = evaluateBoard(finalBoard, droppedY, shape.length, flippedGravity || false, isTSpinMove);

            if(score > bestScore) {
              bestScore = score;
              bestMove = { x, r, score, y: droppedY, type: tetrominoType };
            }
          }
        }

        if (mode === 'EVALUATE' && playerMove && bestMove) {
            const response: WorkerResponse = { type: 'EVALUATION', bestMove, id };
            self.postMessage(response);
        } else {
            // Standard Hint - return with ID
            const response: WorkerResponse = { result: bestMove || null, id };
            self.postMessage(response);
        }

      } catch(err) {
        // console.error("Worker Error", err); // safely ignored in prod
        self.postMessage({ result: null, id: e.data?.id || 0 });
      }
    };
};

export const createAiWorker = (): Worker | null => {
  try {
      const logicString = workerLogic.toString();
      const bodyContent = logicString.substring(logicString.indexOf('{') + 1, logicString.lastIndexOf('}'));
      const blob = new Blob([bodyContent], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      const worker = new Worker(url);
      return worker;
  } catch (e) {
      console.warn("[Reliability] Failed to create AI Worker. AI features disabled.", e);
      return null;
  }
};
