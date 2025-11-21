
import { checkCollision, rotateMatrix, createStage } from '../utils/gameUtils';
import { TETROMINOS, STAGE_WIDTH, STAGE_HEIGHT } from '../constants';

declare const describe: (name: string, callback: () => void) => void;
declare const it: (name: string, callback: () => void) => void;
declare const beforeEach: (callback: () => void) => void;
declare const expect: (actual: any) => { 
    toBe: (expected: any) => void; 
    toEqual: (expected: any) => void; 
};

describe('gameUtils', () => {
  describe('rotateMatrix', () => {
    it('should rotate a matrix 90 degrees clockwise', () => {
      const matrix = [
        [1, 0],
        [1, 1]
      ];
      const expected = [
        [1, 1],
        [1, 0]
      ];
      expect(rotateMatrix(matrix as any, 1)).toEqual(expected);
    });

    it('should rotate a matrix 90 degrees counter-clockwise', () => {
      const matrix = [
        [1, 0],
        [1, 1]
      ];
      const expected = [
        [0, 1],
        [1, 1]
      ];
      expect(rotateMatrix(matrix as any, -1)).toEqual(expected);
    });
  });

  describe('checkCollision', () => {
    let stage = createStage();
    const player = {
      pos: { x: 0, y: 0 },
      tetromino: TETROMINOS['T'], // T shape
      collided: false
    };

    beforeEach(() => {
      stage = createStage();
    });

    it('should detect collision with floor', () => {
      // Position player at the very bottom
      player.pos.y = STAGE_HEIGHT - player.tetromino.shape.length;
      // Try to move down 1
      const collided = checkCollision(player, stage, { x: 0, y: 1 });
      expect(collided).toBe(true);
    });

    it('should detect collision with walls', () => {
      player.pos.x = 0;
      // Try to move left
      const collidedLeft = checkCollision(player, stage, { x: -1, y: 0 });
      expect(collidedLeft).toBe(true);

      player.pos.x = STAGE_WIDTH - player.tetromino.shape[0].length;
      // Try to move right
      const collidedRight = checkCollision(player, stage, { x: 1, y: 0 });
      expect(collidedRight).toBe(true);
    });

    it('should detect collision with another block', () => {
       // Place a block in the stage
       stage[5][5] = ['I', 'merged'];
       
       // Position player right above it
       player.pos.x = 5;
       player.pos.y = 3; // T-piece is 3 high, so bottom is at y+2 = 5
       
       // T-Shape:
       // . T .
       // T T T
       // . . . 
       // If we assume basic T shape logic, we need to be precise about shape definition
       
       // Easier test: Direct overlap check logic
       // If we move player INTO the block
       player.pos.y = 5; // Direct overlap
       const collided = checkCollision(player, stage, { x: 0, y: 0 });
       expect(collided).toBe(true);
    });
  });
});
