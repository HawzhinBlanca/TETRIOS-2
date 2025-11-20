
import { Board, TetrominoShape, TetrominoType, MoveScore } from '../types';
import { STAGE_HEIGHT, STAGE_WIDTH, TETROMINOS } from '../constants';
import { rotateMatrix } from './gameUtils';

const WEIGHTS = {
  landingHeight: -4.500158825082766,
  rowsCleared: 3.4181268101392694,
  rowTransitions: -3.2178882868487753,
  colTransitions: -9.348695305445199,
  holes: -7.899265427351652,
  wellSums: -3.3855972247263626,
};

const cloneBoard = (board: Board): Board => board.map(row => row.map(cell => [...cell]));

const lockPiece = (board: Board, shape: TetrominoShape, x: number, y: number) => {
  let dy = y;
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

  for(let r=0; r<shape.length; r++) {
      for(let c=0; c<shape[r].length; c++) {
          if(shape[r][c] !== 0) {
              const ny = dy + r;
              const nx = x + c;
              if(ny >= 0 && ny < STAGE_HEIGHT && nx >= 0 && nx < STAGE_WIDTH) {
                 board[ny][nx] = ['G', 'merged']; // Marker
              }
          }
      }
  }
  return { board, droppedY: dy };
};

const evaluateBoard = (board: Board, droppedY: number, shapeHeight: number) => {
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
};

export const getBestMove = (stage: Board, type: TetrominoType): MoveScore | null => {
    let bestScore = -Infinity;
    let bestMove: MoveScore | null = null;

    const baseShape = TETROMINOS[type].shape;

    for(let r=0; r<4; r++) {
        let shape = baseShape;
        for(let i=0; i<r; i++) shape = rotateMatrix(shape, 1);
        
        for(let x=-2; x<STAGE_WIDTH; x++) {
            let validX = true;
            for(let row=0; row<shape.length; row++) {
               for(let col=0; col<shape[row].length; col++) {
                   if(shape[row][col] !== 0) {
                       if(x+col < 0 || x+col >= STAGE_WIDTH) validX = false;
                   }
               }
            }
            
            if(!validX) continue;

            const simBoard = cloneBoard(stage);
            
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
                bestMove = { x, r, score };
            }
        }
    }
    return bestMove;
};
