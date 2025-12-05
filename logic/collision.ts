
import { Player, Board, TetrominoType } from '../types';
import { KICKS, STAGE_WIDTH, STAGE_HEIGHT } from '../constants';

const isPositionOutOfBounds = (x: number, y: number, boardW: number, boardH: number, flippedGravity: boolean): boolean => {
    if (x < 0 || x >= boardW) return true;
    if (flippedGravity) {
        if (y < 0) return true;
    } else {
        if (y >= boardH) return true;
    }
    return false;
};

const isCellOccupied = (stage: Board, x: number, y: number): boolean => {
    const boardH = stage.length;
    // Check valid vertical range before accessing array
    if (y >= 0 && y < boardH) {
        if (stage[y][x][1] !== 'clear') return true;
    }
    return false;
};

const checkPointCollision = (x: number, y: number, stage: Board, flippedGravity: boolean): boolean => {
    const boardH = stage.length;
    const boardW = stage[0].length;

    if (isPositionOutOfBounds(x, y, boardW, boardH, flippedGravity)) return true;
    return isCellOccupied(stage, x, y);
};

export const checkCollision = (
  player: Player,
  stage: Board,
  moveX: number,
  moveY: number,
  flippedGravity: boolean
): boolean => {
  const { shape } = player.tetromino;

  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x] !== 0) {
        const nextX = player.pos.x + x + moveX;
        const nextY = player.pos.y + y + moveY;

        if (checkPointCollision(nextX, nextY, stage, flippedGravity)) {
            return true;
        }
      }
    }
  }
  return false;
};

export const getGhostY = (player: Player, board: Board, flippedGravity: boolean): number => {
    let offsetStep = 0;
    const dy = flippedGravity ? -1 : 1;
    const LIMIT = board.length + 4;
    
    while (offsetStep < LIMIT) {
        if (checkCollision(player, board, 0, (offsetStep + 1) * dy, flippedGravity)) {
            break;
        }
        offsetStep++;
    }
    
    return player.pos.y + (offsetStep * dy);
};

export const isTSpin = (player: Player, board: Board, flippedGravity: boolean): boolean => {
    if (player.tetromino.type !== 'T') return false;
    
    const { x, y } = player.pos;
    
    // T-piece 3x3 matrix center is at (1,1).
    // The 4 corners relative to (x,y) are (0,0), (2,0), (0,2), (2,2).
    const corners = [
        { x: x, y: y },
        { x: x + 2, y: y },
        { x: x, y: y + 2 },
        { x: x + 2, y: y + 2 }
    ];
    
    let occupied = 0;
    
    for (const c of corners) {
        if (checkPointCollision(c.x, c.y, board, flippedGravity)) {
            occupied++;
        }
    }
    
    return occupied >= 3;
};

export const getWallKicks = (type: TetrominoType, rotationIndex: number, direction: number): [number, number][] => {
    // Assuming simple SRS logic where we just try a few offsets if rotation fails.
    // Since rotationIndex is not properly tracked in the simplified GameState for this exercise,
    // we return the full set of kicks for state 0->1 (CW) or similar.
    
    const kickData = (type === 'I') ? KICKS.I : KICKS.JLSTZ;
    // Return first set of kicks as fallback
    if (kickData && kickData[0]) {
        return kickData[0];
    }
    return [[0,0]];
};
