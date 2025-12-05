
import { checkCollision, isTSpin } from '../logic/collision';
import { TETROMINOS, STAGE_WIDTH, STAGE_HEIGHT } from '../constants';
import { createStage } from '../utils/gameUtils';
import { Player } from '../types';

declare var describe: any;
declare var it: any;
declare var expect: any;
declare var beforeEach: any;

describe('Logic: Collision', () => {
  let stage: any[][];
  let player: Player;

  beforeEach(() => {
    stage = createStage();
    player = {
      pos: { x: 4, y: 0 },
      tetromino: TETROMINOS['T'], // T shape
      collided: false,
      trail: []
    };
  });

  describe('checkCollision', () => {
    it('detects collision with floor (Standard Gravity)', () => {
      // Position at bottom
      player.pos.y = STAGE_HEIGHT - 2; // T piece height is 2 effective
      // Check moving down 1
      const result = checkCollision(player, stage, 0, 1, false);
      expect(result).toBe(false); 
      
      // Move further down to definitely collide
      player.pos.y = STAGE_HEIGHT - 1;
      const resultHard = checkCollision(player, stage, 0, 1, false);
      expect(resultHard).toBe(true);
    });

    it('detects collision with walls', () => {
      player.pos.x = -1; 
      const resultLeft = checkCollision(player, stage, 0, 0, false);
      expect(resultLeft).toBe(true);

      player.pos.x = STAGE_WIDTH;
      const resultRight = checkCollision(player, stage, 0, 0, false);
      expect(resultRight).toBe(true);
    });

    it('detects collision with other blocks', () => {
      stage[5][4] = ['I', 'merged'];
      player.pos.y = 4;
      player.pos.x = 4;
      // T-piece center is at 1,1 relative to pos. 
      // T shape row 1 is ['T','T','T'].
      // If player is at 4,4. Row 1 is at y=5.
      // stage[5][4] is occupied.
      // Collision!
      const result = checkCollision(player, stage, 0, 0, false);
      expect(result).toBe(true);
    });

    it('handles Flipped Gravity bounds', () => {
      // In flipped gravity, floor is y < 0
      player.pos.y = 0;
      const result = checkCollision(player, stage, 0, -1, true);
      expect(result).toBe(true);
    });
  });

  describe('isTSpin', () => {
    it('detects T-Spin based on 3-corner rule', () => {
        // Mock a T-Spin setup
        stage = createStage();
        player.tetromino = TETROMINOS['T'];
        player.pos = { x: 1, y: 1 };
        
        // Fill corners around player
        stage[1][1] = ['G', 'merged']; 
        stage[3][1] = ['G', 'merged'];
        stage[1][3] = ['G', 'merged'];
        
        expect(isTSpin(player, stage, false)).toBe(true);
    });
  });
});
